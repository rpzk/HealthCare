import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'
import { logger } from '@/lib/logger'

// GET - Obter questionário por token (acesso público para paciente)
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const questionnaire = await prisma.patientQuestionnaire.findUnique({
      where: { accessToken: params.token },
      include: {
        template: {
          include: {
            categories: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    options: {
                      orderBy: { order: 'asc' }
                    }
                  }
                }
              }
            }
          }
        },
        patient: {
          select: { id: true, name: true }
        },
        sentBy: {
          select: { id: true, name: true, speciality: true }
        },
        answers: {
          select: { questionId: true }
        }
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionário não encontrado' }, { status: 404 })
    }

    // Verificar se expirou
    if (questionnaire.expiresAt && questionnaire.expiresAt < new Date()) {
      // Atualizar status se ainda não foi
      if (questionnaire.status !== 'EXPIRED') {
        await prisma.patientQuestionnaire.update({
          where: { id: questionnaire.id },
          data: { status: 'EXPIRED' }
        })
      }
      return NextResponse.json({ 
        error: 'Este questionário expirou',
        code: 'EXPIRED',
        expiredAt: questionnaire.expiresAt
      }, { status: 410 })
    }

    // Verificar se já foi completado
    if (questionnaire.status === 'COMPLETED') {
      return NextResponse.json({
        error: 'Este questionário já foi respondido',
        code: 'COMPLETED',
        completedAt: questionnaire.completedAt
      }, { status: 410 })
    }

    // Calcular total de perguntas e progresso
    const totalQuestions = questionnaire.template.categories.reduce(
      (acc, cat) => acc + cat.questions.length, 0
    )
    const answeredQuestions = questionnaire.answers.length

    // Se paciente está acessando pela primeira vez, marcar como em progresso
    if (questionnaire.status === 'PENDING') {
      await prisma.patientQuestionnaire.update({
        where: { id: questionnaire.id },
        data: { 
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      })
    }

    // Remover campos sensíveis e retornar
    const { answers, ...rest } = questionnaire

    return NextResponse.json({
      ...rest,
      totalQuestions,
      answeredQuestions,
      progressPercent: Math.round((answeredQuestions / totalQuestions) * 100)
    })

  } catch (error: any) {
    logger.error('Error fetching questionnaire:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Salvar respostas (parcial ou final)
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const questionnaire = await prisma.patientQuestionnaire.findUnique({
      where: { accessToken: params.token },
      include: {
        template: {
          include: {
            categories: {
              include: {
                questions: {
                  select: { id: true, isRequired: true }
                }
              }
            }
          }
        }
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionário não encontrado' }, { status: 404 })
    }

    // Verificar se pode responder
    if (questionnaire.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Questionário já completado' }, { status: 400 })
    }
    if (questionnaire.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Questionário expirado' }, { status: 400 })
    }

    const body = await req.json()
    const { answers, isComplete } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Respostas são obrigatórias' }, { status: 400 })
    }

    // Salvar respostas em transação
    await prisma.$transaction(async (tx) => {
      for (const answer of answers) {
        const { questionId, textValue, numericValue, booleanValue, selectedOptionId, selectedOptionIds, bodyMapData, timeSpentSeconds } = answer

        // Upsert - atualiza se já existe, cria se não
        await tx.patientAnswer.upsert({
          where: {
            questionnaireId_questionId: {
              questionnaireId: questionnaire.id,
              questionId
            }
          },
          create: {
            questionnaireId: questionnaire.id,
            questionId,
            textValue,
            numericValue,
            booleanValue,
            selectedOptionId,
            selectedOptionIds: selectedOptionIds || [],
            bodyMapData,
            timeSpentSeconds
          },
          update: {
            textValue,
            numericValue,
            booleanValue,
            selectedOptionId,
            selectedOptionIds: selectedOptionIds || [],
            bodyMapData,
            timeSpentSeconds,
            answeredAt: new Date()
          }
        })
      }
    })

    // Contar respostas atuais
    const answeredCount = await prisma.patientAnswer.count({
      where: { questionnaireId: questionnaire.id }
    })

    // Calcular total de perguntas
    const totalQuestions = questionnaire.template.categories.reduce(
      (acc, cat) => acc + cat.questions.length, 0
    )

    const progressPercent = Math.round((answeredCount / totalQuestions) * 100)

    // Se marcou como completo, verificar se todas obrigatórias foram respondidas
    if (isComplete) {
      const requiredQuestions = questionnaire.template.categories.flatMap(
        cat => cat.questions.filter(q => q.isRequired).map(q => q.id)
      )

      const answeredIds = await prisma.patientAnswer.findMany({
        where: { questionnaireId: questionnaire.id },
        select: { questionId: true }
      })
      const answeredSet = new Set(answeredIds.map(a => a.questionId))

      const missingRequired = requiredQuestions.filter(id => !answeredSet.has(id))

      if (missingRequired.length > 0) {
        return NextResponse.json({
          error: 'Há perguntas obrigatórias não respondidas',
          code: 'MISSING_REQUIRED',
          missingCount: missingRequired.length
        }, { status: 400 })
      }

      // Marcar como completo
      const completedQuestionnaire = await prisma.patientQuestionnaire.update({
        where: { id: questionnaire.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progressPercent: 100
        },
        include: {
          template: { select: { name: true } },
          patient: { select: { name: true } },
          sentBy: { select: { id: true } }
        }
      })

      // Notificar profissional que questionário foi respondido
      await QuestionnaireNotificationService.notifyQuestionnaireCompleted(
        completedQuestionnaire.sentBy.id,
        completedQuestionnaire.patient.name,
        completedQuestionnaire.template.name,
        completedQuestionnaire.id,
        completedQuestionnaire.patientId
      )

      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        message: 'Questionário concluído com sucesso! Obrigado por responder.'
      })
    }

    // Atualizar progresso
    await prisma.patientQuestionnaire.update({
      where: { id: questionnaire.id },
      data: { progressPercent }
    })

    return NextResponse.json({
      success: true,
      status: 'IN_PROGRESS',
      progressPercent,
      answeredCount,
      totalQuestions
    })

  } catch (error: any) {
    logger.error('Error saving answers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
