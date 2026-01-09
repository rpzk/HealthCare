import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET - Lista templates de questionários
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const therapeuticSystem = searchParams.get('system')
    const includeBuiltIn = searchParams.get('builtIn') !== 'false'

    const templates = await prisma.questionnaireTemplate.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { isPublic: true },
          ...(includeBuiltIn ? [{ isBuiltIn: true }] : [])
        ],
        ...(therapeuticSystem ? { therapeuticSystem: therapeuticSystem as any } : {})
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
      questionCount: t.categories.reduce((acc, cat) => acc + cat.questions.length, 0)
    }))

    return NextResponse.json(templatesWithCount)

  } catch (error: any) {
    console.error('Error fetching questionnaire templates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Criar novo template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
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

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const template = await prisma.questionnaireTemplate.create({
      data: {
        name,
        description,
        patientIntro,
        therapeuticSystem: therapeuticSystem || 'GENERAL',
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
        scoringLogic,
        categories: categories ? {
          create: categories.map((cat: any, catIndex: number) => ({
            name: cat.name,
            description: cat.description,
            order: cat.order ?? catIndex,
            iconEmoji: cat.iconEmoji,
            questions: cat.questions ? {
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
                options: q.options ? {
                  create: q.options.map((opt: any, optIndex: number) => ({
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

  } catch (error: any) {
    console.error('Error creating questionnaire template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
