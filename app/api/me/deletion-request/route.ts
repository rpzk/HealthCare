/**
 * API de Solicitação de Exclusão de Dados LGPD (Art. 18, VI)
 * Permite que o paciente solicite a exclusão de seus dados
 * 
 * IMPORTANTE: Prontuários médicos não podem ser excluídos antes de 20 anos
 * conforme Resolução CFM nº 1.821/2007
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const deletionRequestSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
  confirmEmail: z.string().email('Email inválido'),
  confirmUnderstanding: z.boolean().refine(v => v === true, {
    message: 'Você deve confirmar que entendeu as consequências'
  })
})

// GET - Verificar status de solicitações de exclusão
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json({ 
        error: 'Usuário não é um paciente registrado' 
      }, { status: 404 })
    }

    // Buscar solicitações existentes
    const requests = await prisma.dataDeletionRequest.findMany({
      where: { patientId: user.patient.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Contar registros que não podem ser excluídos (retenção legal)
    const [medicalRecordsCount, prescriptionsCount, certificatesCount] = await Promise.all([
      prisma.medicalRecord.count({ where: { patientId: user.patient.id, deletedAt: null } }),
      prisma.prescription.count({ where: { patientId: user.patient.id } }),
      prisma.medicalCertificate.count({ where: { patientId: user.patient.id } })
    ])

    return NextResponse.json({
      requests: requests.map(r => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
        processorNotes: r.processorNotes
      })),
      retentionInfo: {
        message: 'Alguns dados possuem período de retenção legal obrigatório',
        medicalRecords: { count: medicalRecordsCount, retention: '20 anos (CFM)', canDelete: false },
        prescriptions: { count: prescriptionsCount, retention: '5 anos (ANVISA)', canDelete: false },
        certificates: { count: certificatesCount, retention: '20 anos', canDelete: false }
      },
      alternatives: {
        anonymization: 'Você pode solicitar a anonimização de dados identificáveis',
        portability: 'Você pode exportar todos os seus dados via /api/me/export'
      }
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar solicitações de exclusão')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova solicitação de exclusão
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validation = deletionRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.errors }, { status: 400 })
    }

    const { reason, confirmEmail } = validation.data

    if (confirmEmail.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Email de confirmação não confere' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json({ error: 'Usuário não é um paciente' }, { status: 404 })
    }

    // Verificar se já existe solicitação pendente
    const pendingRequest = await prisma.dataDeletionRequest.findFirst({
      where: { patientId: user.patient.id, status: 'PENDING' }
    })

    if (pendingRequest) {
      return NextResponse.json({ 
        error: 'Já existe uma solicitação pendente',
        existingRequest: { id: pendingRequest.id, createdAt: pendingRequest.createdAt }
      }, { status: 409 })
    }

    // Criar solicitação
    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        patientId: user.patient.id,
        userId: session.user.id,
        reason,
        status: 'PENDING',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: 'PATIENT',
        action: 'LGPD_DELETION_REQUEST',
        resourceType: 'DataDeletionRequest',
        resourceId: deletionRequest.id,
        success: true,
        metadata: { reason },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    logger.info({ patientId: user.patient.id, requestId: deletionRequest.id }, 'Solicitação LGPD criada')

    return NextResponse.json({
      success: true,
      message: 'Solicitação registrada',
      request: { id: deletionRequest.id, status: deletionRequest.status, createdAt: deletionRequest.createdAt },
      nextSteps: [
        'Sua solicitação será analisada pelo DPO',
        'Prazo máximo: 15 dias (Art. 18, §5º LGPD)',
        'Dados com retenção legal serão anonimizados'
      ]
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, 'Erro ao criar solicitação de exclusão')
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 })
  }
}
