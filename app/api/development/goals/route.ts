import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createGoalSchema = z.object({
  planId: z.string().min(1, 'ID do plano é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  category: z.enum(['HEALTH', 'MENTAL', 'CAREER', 'RELATIONSHIPS', 'PERSONAL', 'SPIRITUAL']),
  strengthCode: z.string().optional(),
  targetDate: z.string().datetime().optional(),
})

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['HEALTH', 'MENTAL', 'CAREER', 'RELATIONSHIPS', 'PERSONAL', 'SPIRITUAL']).optional(),
  strengthCode: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  targetDate: z.string().datetime().optional(),
})

// GET - Lista metas de um plano
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')

    if (!planId) {
      return NextResponse.json({ error: 'ID do plano é obrigatório' }, { status: 400 })
    }

    const goals = await prisma.developmentGoal.findMany({
      where: { planId },
      include: {
        actions: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar metas:')
    return NextResponse.json(
      { error: 'Erro ao buscar metas' },
      { status: 500 }
    )
  }
}

// POST - Cria nova meta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = createGoalSchema.parse(body)

    // Verificar se o plano existe
    const plan = await prisma.developmentPlan.findUnique({
      where: { id: data.planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    const goal = await prisma.developmentGoal.create({
      data: {
        planId: data.planId,
        title: data.title,
        description: data.description,
        category: data.category,
        strengthCode: data.strengthCode,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
      include: {
        actions: true,
      },
    })

    logger.info(`Meta criada: ${goal.id} no plano ${data.planId}`)

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao criar meta:')
    return NextResponse.json(
      { error: 'Erro ao criar meta' },
      { status: 500 }
    )
  }
}

// PUT - Atualiza meta
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('id')

    if (!goalId) {
      return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const data = updateGoalSchema.parse(body)

    const goal = await prisma.developmentGoal.update({
      where: { id: goalId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.strengthCode !== undefined && { strengthCode: data.strengthCode }),
        ...(data.status && { status: data.status }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.targetDate && { targetDate: new Date(data.targetDate) }),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        actions: true,
      },
    })

    logger.info(`Meta atualizada: ${goalId}`)

    return NextResponse.json(goal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao atualizar meta:')
    return NextResponse.json(
      { error: 'Erro ao atualizar meta' },
      { status: 500 }
    )
  }
}

// DELETE - Remove meta
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('id')

    if (!goalId) {
      return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 })
    }

    await prisma.developmentGoal.delete({
      where: { id: goalId },
    })

    logger.info(`Meta removida: ${goalId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover meta:')
    return NextResponse.json(
      { error: 'Erro ao remover meta' },
      { status: 500 }
    )
  }
}
