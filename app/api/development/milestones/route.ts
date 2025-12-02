import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createMilestoneSchema = z.object({
  planId: z.string().min(1, 'ID do plano é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  celebration: z.string().optional(),
})

const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  achieved: z.boolean().optional(),
  celebration: z.string().optional(),
})

// GET - Lista marcos de um plano
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

    const milestones = await prisma.developmentMilestone.findMany({
      where: { planId },
      orderBy: { targetDate: 'asc' },
    })

    return NextResponse.json(milestones)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar marcos:')
    return NextResponse.json(
      { error: 'Erro ao buscar marcos' },
      { status: 500 }
    )
  }
}

// POST - Cria novo marco
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = createMilestoneSchema.parse(body)

    // Verificar se o plano existe
    const plan = await prisma.developmentPlan.findUnique({
      where: { id: data.planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    const milestone = await prisma.developmentMilestone.create({
      data: {
        planId: data.planId,
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        celebration: data.celebration,
      },
    })

    logger.info(`Marco criado: ${milestone.id} no plano ${data.planId}`)

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao criar marco:')
    return NextResponse.json(
      { error: 'Erro ao criar marco' },
      { status: 500 }
    )
  }
}

// PUT - Atualiza marco
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('id')

    if (!milestoneId) {
      return NextResponse.json({ error: 'ID do marco é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const data = updateMilestoneSchema.parse(body)

    const milestone = await prisma.developmentMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.targetDate && { targetDate: new Date(data.targetDate) }),
        ...(data.achieved !== undefined && { 
          achieved: data.achieved,
          achievedAt: data.achieved ? new Date() : null,
        }),
        ...(data.celebration !== undefined && { celebration: data.celebration }),
      },
    })

    logger.info(`Marco atualizado: ${milestoneId}`)

    return NextResponse.json(milestone)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao atualizar marco:')
    return NextResponse.json(
      { error: 'Erro ao atualizar marco' },
      { status: 500 }
    )
  }
}

// DELETE - Remove marco
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('id')

    if (!milestoneId) {
      return NextResponse.json({ error: 'ID do marco é obrigatório' }, { status: 400 })
    }

    await prisma.developmentMilestone.delete({
      where: { id: milestoneId },
    })

    logger.info(`Marco removido: ${milestoneId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover marco:')
    return NextResponse.json(
      { error: 'Erro ao remover marco' },
      { status: 500 }
    )
  }
}
