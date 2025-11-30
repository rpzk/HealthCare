import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StratumLevel } from '@prisma/client'

// GET - Buscar assessments do usuário ou todos (se admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    
    // Admin pode ver todos, outros só os próprios
    if (session.user.role === 'ADMIN' && userId) {
      where.userId = userId
    } else if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    }

    if (status) {
      where.status = status
    }

    const assessments = await prisma.stratumAssessment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        responses: {
          include: {
            question: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Erro ao buscar assessments:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar assessments' },
      { status: 500 }
    )
  }
}

// POST - Iniciar novo assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, assessmentType } = body

    // Verificar se o usuário pode criar assessment para outro
    const targetUserId = userId || session.user.id
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar se já existe um assessment em andamento
    const existing = await prisma.stratumAssessment.findFirst({
      where: {
        userId: targetUserId,
        status: 'IN_PROGRESS'
      }
    })

    if (existing) {
      return NextResponse.json({ 
        assessment: existing,
        message: 'Assessment em andamento encontrado'
      })
    }

    // Criar novo assessment
    const assessment = await prisma.stratumAssessment.create({
      data: {
        userId: targetUserId,
        assessmentType: assessmentType || 'SELF',
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Erro ao criar assessment:', error)
    return NextResponse.json(
      { error: 'Erro ao criar assessment' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar assessment (completar, cancelar)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, action } = body

    const assessment = await prisma.stratumAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: {
          include: { question: true }
        }
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment não encontrado' }, { status: 404 })
    }

    // Verificar permissão
    if (assessment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (action === 'complete') {
      // Calcular resultado
      const result = calculateStratumResult(assessment.responses)

      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          calculatedStratum: result.stratum,
          timeSpanMonths: result.timeSpanMonths,
          confidenceScore: result.confidence
        }
      })

      return NextResponse.json({ 
        assessment: updated,
        result
      })
    }

    if (action === 'cancel') {
      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: { status: 'CANCELLED' }
      })
      return NextResponse.json({ assessment: updated })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao atualizar assessment:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar assessment' },
      { status: 500 }
    )
  }
}

// Função para calcular o resultado do assessment
interface ResponseWithQuestion {
  timeSpanValue: number | null
  score: number | null
  question: {
    weight: number
    stratumMapping: string
  }
  answer: string
}

function calculateStratumResult(responses: ResponseWithQuestion[]) {
  if (responses.length === 0) {
    return { stratum: 'S1' as StratumLevel, timeSpanMonths: 3, confidence: 0 }
  }

  let totalWeight = 0
  let weightedTimeSpan = 0
  let validResponses = 0

  for (const response of responses) {
    const weight = response.question.weight
    totalWeight += weight

    if (response.timeSpanValue) {
      weightedTimeSpan += response.timeSpanValue * weight
      validResponses++
    }
  }

  // Calcular time span médio ponderado
  const avgTimeSpan = totalWeight > 0 ? weightedTimeSpan / totalWeight : 3

  // Mapear time span para estrato (baseado em Elliott Jaques)
  const stratum = timeSpanToStratum(avgTimeSpan)

  // Confiança baseada em quantas perguntas foram respondidas
  const totalQuestions = responses.length
  const confidence = validResponses / totalQuestions

  return {
    stratum,
    timeSpanMonths: Math.round(avgTimeSpan),
    confidence: Math.round(confidence * 100) / 100
  }
}

function timeSpanToStratum(months: number): StratumLevel {
  // Baseado na teoria de Elliott Jaques
  // S1: 1 dia - 3 meses
  // S2: 3 meses - 1 ano
  // S3: 1 - 2 anos
  // S4: 2 - 5 anos
  // S5: 5 - 10 anos
  // S6: 10 - 20 anos
  // S7: 20 - 50 anos
  // S8: 50+ anos

  if (months <= 3) return 'S1'
  if (months <= 12) return 'S2'
  if (months <= 24) return 'S3'
  if (months <= 60) return 'S4'
  if (months <= 120) return 'S5'
  if (months <= 240) return 'S6'
  if (months <= 600) return 'S7'
  return 'S8'
}
