import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'

export const runtime = 'nodejs'

function isAdminSession(session: any) {
  const role = session?.user?.role
  const availableRoles = (session?.user as any)?.availableRoles
  return role === 'ADMIN' || (Array.isArray(availableRoles) && availableRoles.includes('ADMIN'))
}

// GET - Obter template específico com todas as perguntas
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isAdmin = isAdminSession(session)

    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id },
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
        },
        createdBy: {
          select: { id: true, name: true }
        },
        _count: {
          select: { sentQuestionnaires: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    // Verificar permissão (dono, público ou built-in)
    if (
      template.createdById !== session.user.id &&
      !template.isPublic &&
      !template.isBuiltIn &&
      !isAdmin
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(template)

  } catch (error) {
    logger.error('Error fetching template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Atualizar template
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isAdmin = isAdminSession(session)

    const existing = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    if (!isAdmin && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para editar' }, { status: 403 })
    }

    if (existing.isBuiltIn && !isAdmin) {
      return NextResponse.json({
        error: 'Templates do sistema não podem ser editados. Crie uma cópia.',
        code: 'BUILTIN_READONLY'
      }, { status: 400 })
    }

    const body = await req.json()
    const {
      name,
      description,
      patientIntro,
      therapeuticSystem,
      estimatedMinutes,
      allowPause,
      showProgress,
      randomizeQuestions,
      themeColor,
      iconEmoji,
      isPublic,
      aiAnalysisPrompt,
      scoringLogic,
      categories
    } = body

    const sentCount = await prisma.patientQuestionnaire.count({
      where: { templateId: existing.id }
    })

    const wantsStructureUpdate = Array.isArray(categories)
    if (wantsStructureUpdate && sentCount > 0) {
      return NextResponse.json({
        error: 'Não é possível alterar perguntas/seções de um template já enviado. Crie uma cópia.',
        code: 'HAS_SENT'
      }, { status: 400 })
    }

    const template = await prisma.$transaction(async (tx) => {
      if (wantsStructureUpdate) {
        await tx.intakeCategory.deleteMany({ where: { templateId: existing.id } })
      }

      return tx.questionnaireTemplate.update({
        where: { id: params.id },
        data: {
          name,
          description,
          patientIntro,
          therapeuticSystem,
          estimatedMinutes,
          allowPause,
          showProgress,
          randomizeQuestions,
          themeColor,
          iconEmoji,
          isPublic,
          aiAnalysisPrompt,
          scoringLogic,
          ...(wantsStructureUpdate
            ? {
                categories: {
                  create: categories.map((cat: any, catIndex: number) => ({
                    name: cat.name,
                    description: cat.description,
                    iconEmoji: cat.iconEmoji,
                    order: cat.order ?? catIndex,
                    questions: cat.questions
                      ? {
                          create: cat.questions.map((q: any, qIndex: number) => ({
                            text: q.text,
                            helpText: q.helpText,
                            imageUrl: q.imageUrl,
                            type: q.type || 'SINGLE_CHOICE',
                            isRequired: q.isRequired ?? true,
                            order: q.order ?? qIndex,
                            scaleMin: q.scaleMin,
                            scaleMax: q.scaleMax,
                            scaleMinLabel: q.scaleMinLabel,
                            scaleMaxLabel: q.scaleMaxLabel,
                            analysisMapping: q.analysisMapping,
                            conditionalLogic: q.conditionalLogic,
                            options: q.options
                              ? {
                                  create: q.options.map((opt: any, optIndex: number) => ({
                                    text: opt.text,
                                    description: opt.description,
                                    imageUrl: opt.imageUrl,
                                    emoji: opt.emoji,
                                    order: opt.order ?? optIndex,
                                    scoreValue: opt.scoreValue,
                                  })),
                                }
                              : undefined,
                          })),
                        }
                      : undefined,
                  })),
                },
              }
            : {}),
        },
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: {
              questions: {
                orderBy: { order: 'asc' },
                include: {
                  options: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { sentQuestionnaires: true } },
        },
      })
    })

    return NextResponse.json(template)

  } catch (error) {
    logger.error('Error updating template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remover template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isAdmin = isAdminSession(session)

    const existing = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { sentQuestionnaires: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    if (!isAdmin && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })
    }

    if (existing.isBuiltIn && !isAdmin) {
      return NextResponse.json({ error: 'Templates do sistema não podem ser excluídos' }, { status: 400 })
    }

    if (existing._count.sentQuestionnaires > 0) {
      const answersCount = await prisma.patientAnswer.count({
        where: {
          questionnaire: {
            templateId: existing.id,
          },
        },
      })

      if (answersCount > 0) {
        return NextResponse.json({
          error: 'Não é possível excluir um template que já possui respostas de pacientes',
          code: 'HAS_RESPONSES'
        }, { status: 400 })
      }

      // Sent but unanswered: remove sent questionnaires first to satisfy FK constraints.
      await prisma.$transaction(async (tx) => {
        await tx.patientQuestionnaire.deleteMany({ where: { templateId: existing.id } })
        await tx.intakeCategory.deleteMany({ where: { templateId: existing.id } })
        await tx.questionnaireTemplate.delete({ where: { id: existing.id } })
      })

      return NextResponse.json({ success: true })
    }

    await prisma.$transaction(async (tx) => {
      await tx.intakeCategory.deleteMany({ where: { templateId: existing.id } })
      await tx.questionnaireTemplate.delete({ where: { id: existing.id } })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error deleting template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
