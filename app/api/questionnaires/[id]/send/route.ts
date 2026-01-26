import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

// POST - Enviar questionário para um paciente
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { patientId, consultationId, expiresInDays, customMessage } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Paciente é obrigatório' }, { status: 400 })
    }

    // Verificar se template existe
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    // Verificar se paciente existe
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, email: true }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Calcular data de expiração (padrão: 7 dias)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7))

    // Criar questionário para o paciente
    const questionnaire = await prisma.patientQuestionnaire.create({
      data: {
        templateId: params.id,
        patientId,
        sentById: session.user.id,
        consultationId,
        expiresAt,
        status: 'PENDING'
      },
      include: {
        template: {
          select: { name: true, iconEmoji: true, estimatedMinutes: true }
        },
        patient: {
          select: { name: true, email: true }
        }
      }
    })

    // Gerar URL de acesso
    const baseUrl = process.env.NEXTAUTH_URL || 'https://healthcare.rafaerpiazenski.com'
    const accessUrl = `${baseUrl}/questionnaire/${questionnaire.accessToken}`

    // Enviar email para o paciente
    if (patient.email) {
      await emailService.sendQuestionnaireEmail(
        patient.email,
        patient.name,
        template.name,
        accessUrl,
        expiresAt
      )
    }

    // Criar notificação para o profissional
    await QuestionnaireNotificationService.notifyQuestionnaireSent(
      session.user.id,
      patient.name,
      template.name,
      questionnaire.id
    )

    return NextResponse.json({
      ...questionnaire,
      accessUrl,
      customMessage,
      emailSent: !!patient.email
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error sending questionnaire:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Listar questionários enviados de um template
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const questionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        templateId: params.id,
        sentById: session.user.id
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true }
        },
        template: {
          select: { name: true, iconEmoji: true }
        }
      },
      orderBy: { sentAt: 'desc' }
    })

    return NextResponse.json(questionnaires)

  } catch (error: any) {
    logger.error('Error listing sent questionnaires:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
