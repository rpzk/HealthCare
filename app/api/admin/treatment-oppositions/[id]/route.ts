/**
 * API Admin - Processar Oposição Individual
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const processSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PARTIAL']),
  analysisNotes: z.string().optional(),
  legalBasis: z.string().optional(),
  rejectionReason: z.string().optional(),
  effectsApplied: z.record(z.boolean()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const opposition = await prisma.treatmentOpposition.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true
          }
        }
      }
    })

    if (!opposition) {
      return NextResponse.json({ error: 'Oposição não encontrada' }, { status: 404 })
    }

    return NextResponse.json(opposition)
  } catch (error) {
    console.error('[AdminOpposition] GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    if (!user || !['ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const validation = processSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Se rejeitada, exigir justificativa
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return NextResponse.json(
        { error: 'Informe a justificativa legal para rejeição' },
        { status: 400 }
      )
    }

    const opposition = await prisma.treatmentOpposition.findUnique({
      where: { id },
      include: { patient: { select: { userId: true, name: true } } }
    })

    if (!opposition) {
      return NextResponse.json({ error: 'Oposição não encontrada' }, { status: 404 })
    }

    if (opposition.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta oposição já foi processada' },
        { status: 400 }
      )
    }

    // Atualizar oposição
    const updated = await prisma.treatmentOpposition.update({
      where: { id },
      data: {
        status: data.status,
        analysisNotes: data.analysisNotes,
        legalBasis: data.legalBasis,
        rejectionReason: data.rejectionReason,
        effectsApplied: data.effectsApplied,
        analyzedById: session.user.id,
        analyzedAt: new Date()
      }
    })

    // Se aprovada, aplicar efeitos (ex: revogar consentimentos relacionados)
    if (data.status === 'APPROVED' && opposition.patient.userId) {
      // Exemplo: se oposição a BIOMETRIC, revogar consentimento biométrico
      // Mapear tipos de tratamento para tipos biométricos do enum BiometricDataType
      const treatmentToConsentMap: Record<string, string[]> = {
        BIOMETRIC: ['FACIAL', 'FINGERPRINT'],
        AI_ANALYSIS: ['OTHER'],
        TELEMEDICINE_RECORD: ['VOICE'],
        RESEARCH: ['OTHER']
      }

      const consentsToRevoke = treatmentToConsentMap[opposition.treatmentType]
      if (consentsToRevoke) {
        // Usar dataType que é o campo correto do modelo PatientBiometricConsent
        // e isGranted ao invés de consentGiven
        for (const dataType of consentsToRevoke) {
          await prisma.patientBiometricConsent.updateMany({
            where: {
              patientId: opposition.patientId,
              dataType: dataType as any
            },
            data: { 
              isGranted: false,
              revokedAt: new Date()
            }
          })
        }
      }
    }

    // Notificar paciente
    if (opposition.patient.userId) {
      const statusMessages: Record<string, string> = {
        APPROVED: '✅ Sua solicitação de oposição foi APROVADA. O tratamento foi suspenso.',
        REJECTED: `❌ Sua solicitação de oposição foi REJEITADA. Motivo: ${data.rejectionReason}`,
        PARTIAL: '⚠️ Sua solicitação de oposição foi PARCIALMENTE APROVADA. Alguns tratamentos foram suspensos.'
      }

      await prisma.notification.create({
        data: {
          userId: opposition.patient.userId,
          type: 'SYSTEM',
          priority: 'high',
          title: '📋 Atualização sobre sua Oposição ao Tratamento',
          message: statusMessages[data.status],
          metadata: {
            oppositionId: id,
            treatmentType: opposition.treatmentType,
            status: data.status
          }
        }
      })
    }

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'ADMIN',
        action: 'TREATMENT_OPPOSITION_PROCESSED',
        resourceType: 'TreatmentOpposition',
        resourceId: id,
        metadata: {
          previousStatus: opposition.status,
          newStatus: data.status,
          patientId: opposition.patientId,
          treatmentType: opposition.treatmentType,
          processedBy: user.name
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      opposition: updated,
      message: `Oposição ${data.status === 'APPROVED' ? 'aprovada' : data.status === 'REJECTED' ? 'rejeitada' : 'parcialmente aprovada'} com sucesso`
    })
  } catch (error) {
    console.error('[AdminOpposition] PUT error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
