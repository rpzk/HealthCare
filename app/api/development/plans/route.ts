import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createPlanSchema = z.object({
  patientId: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  futureVision: z.string().optional(),
  currentStratum: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  targetStratum: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  primaryStrengths: z.array(z.string()).optional(),
  developmentAreas: z.array(z.string()).optional(),
  targetDate: z.string().datetime().optional(),
})

// GET - Lista planos de desenvolvimento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    // Se patientId fornecido, busca planos do paciente
    // Senão, busca planos do usuário logado
    if (patientId) {
      where.patientId = patientId
    } else {
      where.userId = session.user.id
    }

    if (status) {
      where.status = status
    }

    const plans = await prisma.developmentPlan.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar planos:')
    return NextResponse.json(
      { error: 'Erro ao buscar planos de desenvolvimento' },
      { status: 500 }
    )
  }
}

// POST - Cria novo plano de desenvolvimento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = createPlanSchema.parse(body)

    const plan = await prisma.developmentPlan.create({
      data: {
        userId: data.patientId ? undefined : session.user.id,
        patientId: data.patientId || undefined,
        title: data.title,
        futureVision: data.futureVision,
        currentStratum: data.currentStratum,
        targetStratum: data.targetStratum,
        primaryStrengths: data.primaryStrengths ? JSON.stringify(data.primaryStrengths) : undefined,
        developmentAreas: data.developmentAreas ? JSON.stringify(data.developmentAreas) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
      include: {
        goals: true,
        milestones: true,
      },
    })

    logger.info(`Plano de desenvolvimento criado: ${plan.id} por ${session.user.id}`)

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    logger.error({ err: error }, 'Erro ao criar plano:')
    return NextResponse.json(
      { error: 'Erro ao criar plano de desenvolvimento' },
      { status: 500 }
    )
  }
}
