import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      !template.isBuiltIn
    ) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(template)

  } catch (error: any) {
    console.error('Error fetching template:', error)
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

    const existing = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    if (existing.createdById !== session.user.id && !existing.isBuiltIn) {
      return NextResponse.json({ error: 'Sem permissão para editar' }, { status: 403 })
    }

    // Se for built-in, criar uma cópia em vez de editar
    if (existing.isBuiltIn) {
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
      scoringLogic
    } = body

    const template = await prisma.questionnaireTemplate.update({
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
        scoringLogic
      }
    })

    return NextResponse.json(template)

  } catch (error: any) {
    console.error('Error updating template:', error)
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

    const existing = await prisma.questionnaireTemplate.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { sentQuestionnaires: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    if (existing.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })
    }

    if (existing.isBuiltIn) {
      return NextResponse.json({ error: 'Templates do sistema não podem ser excluídos' }, { status: 400 })
    }

    if (existing._count.sentQuestionnaires > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir um template que já foi enviado para pacientes',
        code: 'HAS_RESPONSES'
      }, { status: 400 })
    }

    await prisma.questionnaireTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
