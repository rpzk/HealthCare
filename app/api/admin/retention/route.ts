/**
 * API de Gestão de Retenção de Dados - CFM 1.821/2007
 * 
 * Conformidade:
 * - Prontuários médicos: mínimo 20 anos após último atendimento
 * - Pacientes menores: até completar 21 anos + 20 anos
 * - Alertas para documentos próximos de expirar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validação
const createPolicySchema = z.object({
  documentType: z.enum([
    'MEDICAL_RECORD',
    'PRESCRIPTION',
    'EXAM_RESULT',
    'MEDICAL_CERTIFICATE',
    'CONSENT_FORM',
    'REFERRAL',
    'TELECONSULTATION',
    'AUDIT_LOG',
    'FINANCIAL'
  ]),
  retentionYears: z.number().min(1).max(100).default(20),
  alertThresholdDays: z.number().min(30).max(730).default(365),
  legalBasis: z.string().optional(),
  description: z.string().optional()
})

const acknowledgeAlertSchema = z.object({
  alertId: z.string(),
  actionTaken: z.string().min(10)
})

/**
 * GET - Lista políticas de retenção e alertas pendentes
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas ADMIN pode gerenciar retenção
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'policies', 'alerts', 'statistics'

    if (type === 'policies') {
      const policies = await prisma.dataRetentionPolicy.findMany({
        where: { isActive: true },
        include: {
          reviewedBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { documentType: 'asc' }
      })

      return NextResponse.json({ policies })
    }

    if (type === 'alerts') {
      const status = url.searchParams.get('status') || 'PENDING'
      
      const alerts = await prisma.retentionAlert.findMany({
        where: {
          status: status as any
        },
        include: {
          acknowledgedBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { expirationDate: 'asc' },
        take: 100
      })

      return NextResponse.json({ alerts })
    }

    // Estatísticas gerais
    const [
      totalPolicies,
      pendingAlerts,
      expiringIn30Days,
      expiringIn90Days,
      recordCount
    ] = await Promise.all([
      prisma.dataRetentionPolicy.count({ where: { isActive: true } }),
      prisma.retentionAlert.count({ where: { status: 'PENDING' } }),
      prisma.retentionAlert.count({
        where: {
          status: 'PENDING',
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.retentionAlert.count({
        where: {
          status: 'PENDING',
          expirationDate: {
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.medicalRecord.count({ where: { deletedAt: null } })
    ])

    return NextResponse.json({
      statistics: {
        totalPolicies,
        pendingAlerts,
        expiringIn30Days,
        expiringIn90Days,
        totalMedicalRecords: recordCount,
        complianceLevel: 'CFM 1.821/2007'
      }
    })

  } catch (error) {
    console.error('[Retention API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados de retenção' },
      { status: 500 }
    )
  }
}

/**
 * POST - Cria política de retenção ou reconhece alerta
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const action = body.action as string

    if (action === 'create_policy') {
      const validation = createPolicySchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const data = validation.data

      // Verificar se já existe política para este tipo
      const existing = await prisma.dataRetentionPolicy.findUnique({
        where: { documentType: data.documentType }
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Já existe política para este tipo de documento' },
          { status: 409 }
        )
      }

      const policy = await prisma.dataRetentionPolicy.create({
        data: {
          documentType: data.documentType,
          retentionYears: data.retentionYears,
          alertThresholdDays: data.alertThresholdDays,
          legalBasis: data.legalBasis || 'CFM Resolução 1.821/2007',
          description: data.description,
          reviewedById: session.user.id,
          lastReviewDate: new Date(),
          nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 ano
        }
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_RETENTION_POLICY',
          resourceType: 'DataRetentionPolicy',
          resourceId: policy.id,
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: {
            documentType: data.documentType,
            retentionYears: data.retentionYears
          }
        }
      })

      return NextResponse.json({ policy }, { status: 201 })
    }

    if (action === 'acknowledge_alert') {
      const validation = acknowledgeAlertSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { alertId, actionTaken } = validation.data

      const alert = await prisma.retentionAlert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedById: session.user.id,
          actionTaken
        }
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'ACKNOWLEDGE_RETENTION_ALERT',
          resourceType: 'RetentionAlert',
          resourceId: alert.id,
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role || 'ADMIN',
          metadata: { actionTaken }
        }
      })

      return NextResponse.json({ alert })
    }

    if (action === 'scan_expiring') {
      // Escanear documentos que estão próximos de expirar
      const policies = await prisma.dataRetentionPolicy.findMany({
        where: { isActive: true }
      })

      let alertsCreated = 0

      for (const policy of policies) {
        const thresholdDate = new Date()
        thresholdDate.setFullYear(thresholdDate.getFullYear() - policy.retentionYears)
        thresholdDate.setDate(thresholdDate.getDate() + policy.alertThresholdDays)

        // Buscar prontuários que vão expirar
        if (policy.documentType === 'MEDICAL_RECORD') {
          const expiringRecords = await prisma.medicalRecord.findMany({
            where: {
              deletedAt: null,
              createdAt: {
                lte: thresholdDate
              },
              retentionExpiresAt: null // Ainda não tem data de expiração definida
            },
            take: 100
          })

          for (const record of expiringRecords) {
            // Calcular data de expiração
            const expirationDate = new Date(record.createdAt)
            expirationDate.setFullYear(expirationDate.getFullYear() + policy.retentionYears)

            // Verificar se já existe alerta
            const existingAlert = await prisma.retentionAlert.findFirst({
              where: {
                documentType: 'MEDICAL_RECORD',
                documentId: record.id,
                status: 'PENDING'
              }
            })

            if (!existingAlert) {
              await prisma.retentionAlert.create({
                data: {
                  documentType: 'MEDICAL_RECORD',
                  documentId: record.id,
                  patientId: record.patientId,
                  documentDate: record.createdAt,
                  expirationDate
                }
              })
              alertsCreated++
            }
          }
        }
      }

      return NextResponse.json({
        message: `Escaneamento concluído. ${alertsCreated} alertas criados.`,
        alertsCreated
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })

  } catch (error) {
    console.error('[Retention API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Atualiza política de retenção
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { id, retentionYears, alertThresholdDays, description, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID da política obrigatório' }, { status: 400 })
    }

    const policy = await prisma.dataRetentionPolicy.update({
      where: { id },
      data: {
        retentionYears: retentionYears ?? undefined,
        alertThresholdDays: alertThresholdDays ?? undefined,
        description: description ?? undefined,
        isActive: isActive ?? undefined,
        reviewedById: session.user.id,
        lastReviewDate: new Date()
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_RETENTION_POLICY',
        resourceType: 'DataRetentionPolicy',
        resourceId: policy.id,
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role || 'ADMIN',
        metadata: { retentionYears, alertThresholdDays, isActive }
      }
    })

    return NextResponse.json({ policy })

  } catch (error) {
    console.error('[Retention API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar política' },
      { status: 500 }
    )
  }
}
