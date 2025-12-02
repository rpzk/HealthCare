import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createActionSchema = z.object({
  goalId: z.string().min(1, 'ID da meta é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONCE']).default('DAILY'),
  dueDate: z.string().datetime().optional(),
})

const updateActionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONCE']).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
})

// GET - Lista ações de uma meta
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')

    if (!goalId) {
      return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 })
    }

    const actions = await prisma.goalAction.findMany({
      where: { goalId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(actions)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar ações:')
    return NextResponse.json(
      { error: 'Erro ao buscar ações' },
      { status: 500 }
    )
  }
}

// POST - Cria nova ação
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = createActionSchema.parse(body)

    // Verificar se a meta existe
    const goal = await prisma.developmentGoal.findUnique({
      where: { id: data.goalId },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })
    }

    const action = await prisma.goalAction.create({
      data: {
        goalId: data.goalId,
        title: data.title,
        description: data.description,
        frequency: data.frequency,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    })

    logger.info(`Ação criada: ${action.id} na meta ${data.goalId}`)

    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao criar ação:')
    return NextResponse.json(
      { error: 'Erro ao criar ação' },
      { status: 500 }
    )
  }
}

// PUT - Atualiza ação
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('id')

    if (!actionId) {
      return NextResponse.json({ error: 'ID da ação é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const data = updateActionSchema.parse(body)

    const action = await prisma.goalAction.update({
      where: { id: actionId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.completed !== undefined && { 
          completed: data.completed,
          completedAt: data.completed ? new Date() : null,
        }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    })

    // Se ação foi completada, atualizar progresso da meta
    if (data.completed !== undefined) {
      await updateGoalProgress(action.goalId)
    }

    logger.info(`Ação atualizada: ${actionId}`)

    return NextResponse.json(action)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao atualizar ação:')
    return NextResponse.json(
      { error: 'Erro ao atualizar ação' },
      { status: 500 }
    )
  }
}

// DELETE - Remove ação
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('id')

    if (!actionId) {
      return NextResponse.json({ error: 'ID da ação é obrigatório' }, { status: 400 })
    }

    const action = await prisma.goalAction.findUnique({
      where: { id: actionId },
    })

    if (!action) {
      return NextResponse.json({ error: 'Ação não encontrada' }, { status: 404 })
    }

    await prisma.goalAction.delete({
      where: { id: actionId },
    })

    // Atualizar progresso da meta após remoção
    await updateGoalProgress(action.goalId)

    logger.info(`Ação removida: ${actionId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover ação:')
    return NextResponse.json(
      { error: 'Erro ao remover ação' },
      { status: 500 }
    )
  }
}

// Função auxiliar para atualizar progresso da meta
async function updateGoalProgress(goalId: string) {
  const actions = await prisma.goalAction.findMany({
    where: { goalId },
  })

  if (actions.length === 0) return

  const completedCount = actions.filter(a => a.completed).length
  const progress = Math.round((completedCount / actions.length) * 100)

  await prisma.developmentGoal.update({
    where: { id: goalId },
    data: {
      progress,
      status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      completedAt: progress === 100 ? new Date() : null,
    },
  })
}
