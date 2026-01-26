import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const responseSchema = z.object({
  assessmentId: z.string(),
  questionId: z.string(),
  // SCENARIO/SCALE (single choice): optionId string
  // OPEN: structured payload with timeSpanMonths (required)
  answer: z.union([
    z.string().min(1),
    z
      .object({
        text: z.string().optional().nullable(),
        timeSpanMonths: z.coerce.number().int().positive(),
        score: z.coerce.number().min(0).max(1).optional().nullable()
      })
      .strict()
  ])
})

function parseStratumMapping(raw: unknown) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// POST - Salvar resposta de uma questão
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { assessmentId, questionId, answer } = responseSchema.parse(await request.json())

    const assessment = await prisma.stratumAssessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, userId: true, status: true }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment não encontrado' }, { status: 404 })
    }

    if (assessment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (assessment.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Assessment não está em andamento' }, { status: 400 })
    }

    const question = await prisma.stratumQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, questionType: true, stratumMapping: true }
    })

    if (!question) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    let timeSpanValue: number | null = null
    let score: number | null = null

    if (question.questionType === 'OPEN') {
      if (typeof answer === 'string') {
        return NextResponse.json(
          { error: 'Para perguntas OPEN, informe timeSpanMonths.' },
          { status: 400 }
        )
      }

      timeSpanValue = Number(answer.timeSpanMonths)
      score = answer.score == null ? null : Number(answer.score)
    } else {
      if (typeof answer !== 'string') {
        return NextResponse.json({ error: 'Resposta inválida para esta pergunta.' }, { status: 400 })
      }

      const mapping = parseStratumMapping(question.stratumMapping) as Record<
        string,
        { timeSpanMonths?: number; score?: number; stratum?: string }
      >

      const mapped = mapping?.[answer]
      if (!mapped || typeof mapped.timeSpanMonths !== 'number' || typeof mapped.score !== 'number') {
        return NextResponse.json({ error: 'Resposta inválida para esta pergunta.' }, { status: 400 })
      }

      timeSpanValue = mapped.timeSpanMonths
      score = mapped.score
    }

    const response = await prisma.stratumAssessmentResponse.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId,
          questionId
        }
      },
      update: {
        answer: JSON.stringify(answer),
        timeSpanValue,
        score,
        answeredAt: new Date()
      },
      create: {
        assessmentId,
        questionId,
        answer: JSON.stringify(answer),
        timeSpanValue,
        score,
        answeredAt: new Date()
      }
    })

    const totalQuestions = await prisma.stratumQuestion.count({
      where: { active: true }
    })
    const answeredQuestions = await prisma.stratumAssessmentResponse.count({
      where: { assessmentId }
    })

    return NextResponse.json({
      response,
      progress: {
        answered: answeredQuestions,
        total: totalQuestions,
        percentage: Math.round((answeredQuestions / totalQuestions) * 100)
      }
    })
  } catch (error) {
    logger.error('Erro ao salvar resposta:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao salvar resposta' }, { status: 500 })
  }
}
