import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const QUESTION_CATEGORIES = [
  'TIME_HORIZON',
  'COMPLEXITY',
  'ABSTRACTION',
  'UNCERTAINTY',
  'DECISION_MAKING',
  'LEADERSHIP'
] as const

const QUESTION_TYPES = ['SCENARIO', 'SCALE', 'RANKING', 'OPEN'] as const

const STRATUM_LEVELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// GET - Buscar questões do assessment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === '1'

    const where: Record<string, unknown> = {}
    if (!includeInactive || session.user.role !== 'ADMIN') {
      where.active = true
    }
    if (category) {
      where.category = category
    }

    const questions = await prisma.stratumQuestion.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    })

    // Parse JSON fields
    const parsed = questions.map(q => ({
      ...q,
      options: safeJsonParse(q.options, []),
      stratumMapping: safeJsonParse(q.stratumMapping, {})
    }))

    return NextResponse.json({ questions: parsed })
  } catch (error) {
    logger.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar questões' },
      { status: 500 }
    )
  }
}

// POST - Criar nova questão (apenas ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    const createSchema = z.object({
      category: z.enum(QUESTION_CATEGORIES),
      questionText: z.string().min(1),
      questionType: z.enum(QUESTION_TYPES).optional(),
      options: z
        .array(
          z
            .object({
              id: z.string().min(1),
              text: z.string().min(1)
            })
            .passthrough()
        )
        .default([]),
      stratumMapping: z
        .record(
          z
            .object({
              timeSpanMonths: z.number().int().positive(),
              score: z.number().min(0).max(1),
              stratum: z.enum(STRATUM_LEVELS)
            })
            .passthrough()
        )
        .default({}),
      weight: z.number().positive().optional(),
      order: z.number().int().nonnegative().optional(),
      active: z.boolean().optional()
    })

    const input = createSchema.parse(body)

    const question = await prisma.stratumQuestion.create({
      data: {
        category: input.category,
        questionText: input.questionText,
        questionType: input.questionType || 'SCENARIO',
        options: JSON.stringify(input.options),
        stratumMapping: JSON.stringify(input.stratumMapping),
        weight: input.weight || 1.0,
        order: input.order || 0,
        active: input.active ?? true
      }
    })

    return NextResponse.json({
      question: {
        ...question,
        options: input.options,
        stratumMapping: input.stratumMapping
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    logger.error('Erro ao criar questão:', error)
    return NextResponse.json(
      { error: 'Erro ao criar questão' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar questão (apenas ADMIN)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    const patchSchema = z
      .object({
        id: z.string().min(1),
        category: z.enum(QUESTION_CATEGORIES).optional(),
        questionText: z.string().min(1).optional(),
        questionType: z.enum(QUESTION_TYPES).optional(),
        options: z
          .array(
            z
              .object({
                id: z.string().min(1),
                text: z.string().min(1)
              })
              .passthrough()
          )
          .optional(),
        stratumMapping: z
          .record(
            z
              .object({
                timeSpanMonths: z.number().int().positive(),
                score: z.number().min(0).max(1),
                stratum: z.enum(STRATUM_LEVELS)
              })
              .passthrough()
          )
          .optional(),
        weight: z.number().positive().optional(),
        order: z.number().int().nonnegative().optional(),
        active: z.boolean().optional()
      })
      .strict()

    const input = patchSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (input.category !== undefined) data.category = input.category
    if (input.questionText !== undefined) data.questionText = input.questionText
    if (input.questionType !== undefined) data.questionType = input.questionType
    if (input.options !== undefined) data.options = JSON.stringify(input.options)
    if (input.stratumMapping !== undefined) data.stratumMapping = JSON.stringify(input.stratumMapping)
    if (input.weight !== undefined) data.weight = input.weight
    if (input.order !== undefined) data.order = input.order
    if (input.active !== undefined) data.active = input.active

    const updated = await prisma.stratumQuestion.update({
      where: { id: input.id },
      data
    })

    return NextResponse.json({
      question: {
        ...updated,
        options: safeJsonParse(updated.options, []),
        stratumMapping: safeJsonParse(updated.stratumMapping, {})
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    logger.error('Erro ao atualizar questão:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar questão' },
      { status: 500 }
    )
  }
}
