import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/api-error-handler'
import { Prisma, TherapeuticSystem, IntakeQuestionType } from '@prisma/client'

function isTherapeuticSystem(value: string): value is TherapeuticSystem {
  return (Object.values(TherapeuticSystem) as string[]).includes(value)
}

function isIntakeQuestionType(value: string): value is IntakeQuestionType {
  return (Object.values(IntakeQuestionType) as string[]).includes(value)
}

type QuestionnaireOptionInput = {
  text: string
  description?: string
  imageUrl?: string
  emoji?: string
  order?: number
  scoreValue?: number
}

type QuestionnaireQuestionInput = {
  text: string
  helpText?: string
  imageUrl?: string
  type?: string
  isRequired?: boolean
  order?: number
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
  analysisMapping?: unknown
  conditionalLogic?: unknown
  options?: QuestionnaireOptionInput[]
}

type QuestionnaireCategoryInput = {
  name: string
  description?: string
  order?: number
  iconEmoji?: string
  questions?: QuestionnaireQuestionInput[]
}

type QuestionnaireTemplateInput = {
  name?: string
  description?: string
  patientIntro?: string
  therapeuticSystem?: string
  estimatedMinutes?: number
  allowPause?: boolean
  showProgress?: boolean
  randomizeQuestions?: boolean
  themeColor?: string
  iconEmoji?: string
  isPublic?: boolean
  aiAnalysisPrompt?: string
  scoringLogic?: unknown
  categories?: QuestionnaireCategoryInput[]
}

export const runtime = 'nodejs'

// GET - Lista templates de questionários
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const therapeuticSystemRaw = searchParams.get('system')
    const therapeuticSystem =
      therapeuticSystemRaw && isTherapeuticSystem(therapeuticSystemRaw)
        ? therapeuticSystemRaw
        : null
    const includeBuiltIn = searchParams.get('builtIn') !== 'false'

    const templates = await prisma.questionnaireTemplate.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { isPublic: true },
          ...(includeBuiltIn ? [{ isBuiltIn: true }] : [])
        ],
        ...(therapeuticSystem ? { therapeuticSystem } : {})
      },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: { id: true }
            }
          }
        },
        _count: {
          select: { sentQuestionnaires: true }
        }
      },
      orderBy: [
        { isBuiltIn: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Add question count to each template
    const templatesWithCount = templates.map(t => ({
      ...t,
      questionCount: t.categories.reduce((acc: number, cat) => acc + cat.questions.length, 0)
    }))

    return NextResponse.json(templatesWithCount)

  } catch (error) {
    logger.error({ err: error }, 'Error fetching questionnaire templates')
    return handleApiError(error)
  }
}

// POST - Criar novo template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = (await req.json()) as QuestionnaireTemplateInput
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

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const template = await prisma.questionnaireTemplate.create({
      data: {
        name,
        description,
        patientIntro,
        therapeuticSystem: (therapeuticSystem && isTherapeuticSystem(therapeuticSystem))
          ? therapeuticSystem
          : TherapeuticSystem.GENERAL,
        estimatedMinutes: estimatedMinutes || 15,
        allowPause: allowPause ?? true,
        showProgress: showProgress ?? true,
        randomizeQuestions: randomizeQuestions ?? false,
        themeColor,
        iconEmoji,
        isPublic: isPublic ?? false,
        isBuiltIn: false,
        createdById: session.user.id,
        aiAnalysisPrompt,
        scoringLogic: (scoringLogic as Prisma.InputJsonValue | undefined),
        categories: categories ? {
          create: categories.map((cat, catIndex) => ({
            name: cat.name,
            description: cat.description,
            order: cat.order ?? catIndex,
            iconEmoji: cat.iconEmoji,
            questions: cat.questions ? {
              create: cat.questions.map((q, qIndex) => ({
                text: q.text,
                helpText: q.helpText,
                imageUrl: q.imageUrl,
                type: (q.type && isIntakeQuestionType(q.type))
                  ? q.type
                  : IntakeQuestionType.SINGLE_CHOICE,
                isRequired: q.isRequired ?? true,
                order: q.order ?? qIndex,
                scaleMin: q.scaleMin,
                scaleMax: q.scaleMax,
                scaleMinLabel: q.scaleMinLabel,
                scaleMaxLabel: q.scaleMaxLabel,
                analysisMapping: (q.analysisMapping as Prisma.InputJsonValue | undefined),
                conditionalLogic: (q.conditionalLogic as Prisma.InputJsonValue | undefined),
                options: q.options ? {
                  create: q.options.map((opt, optIndex) => ({
                    text: opt.text,
                    description: opt.description,
                    imageUrl: opt.imageUrl,
                    emoji: opt.emoji,
                    order: opt.order ?? optIndex,
                    scoreValue: opt.scoreValue
                  }))
                } : undefined
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        categories: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(template, { status: 201 })

  } catch (error) {
    logger.error({ err: error }, 'Error creating questionnaire template')
    return handleApiError(error)
  }
}
