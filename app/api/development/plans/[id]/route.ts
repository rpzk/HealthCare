import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  futureVision: z.string().optional(),
  currentStratum: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  targetStratum: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  primaryStrengths: z.array(z.string()).optional(),
  developmentAreas: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
  targetDate: z.string().datetime().optional(),
})

// GET - Busca plano específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const plan = await prisma.developmentPlan.findUnique({
      where: { id },
      include: {
        goals: {
          include: {
            actions: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
        patient: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar plano:')
    return NextResponse.json(
      { error: 'Erro ao buscar plano de desenvolvimento' },
      { status: 500 }
    )
  }
}

// PUT - Atualiza plano
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updatePlanSchema.parse(body)

    const existing = await prisma.developmentPlan.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    const plan = await prisma.developmentPlan.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.futureVision !== undefined && { futureVision: data.futureVision }),
        ...(data.currentStratum && { currentStratum: data.currentStratum }),
        ...(data.targetStratum && { targetStratum: data.targetStratum }),
        ...(data.primaryStrengths && { primaryStrengths: JSON.stringify(data.primaryStrengths) }),
        ...(data.developmentAreas && { developmentAreas: JSON.stringify(data.developmentAreas) }),
        ...(data.status && { status: data.status }),
        ...(data.targetDate && { targetDate: new Date(data.targetDate) }),
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        goals: {
          include: {
            actions: true,
          },
        },
        milestones: true,
      },
    })

    logger.info(`Plano atualizado: ${id} por ${session.user.id}`)

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao atualizar plano:')
    return NextResponse.json(
      { error: 'Erro ao atualizar plano de desenvolvimento' },
      { status: 500 }
    )
  }
}

// DELETE - Remove plano
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.developmentPlan.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    await prisma.developmentPlan.delete({
      where: { id },
    })

    logger.info(`Plano removido: ${id} por ${session.user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover plano:')
    return NextResponse.json(
      { error: 'Erro ao remover plano de desenvolvimento' },
      { status: 500 }
    )
  }
}
