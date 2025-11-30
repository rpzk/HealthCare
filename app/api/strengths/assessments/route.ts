import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar assessments de forças
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    
    if (patientId) {
      where.patientId = patientId
    } else if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    }

    if (status) {
      where.status = status
    }

    const assessments = await prisma.strengthAssessment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        patient: { select: { id: true, name: true, email: true } },
        results: {
          include: { strength: true },
          orderBy: { rank: 'asc' }
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

// POST - Iniciar novo assessment de forças
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId } = body

    // Verificar assessment em andamento
    const whereCheck: Record<string, unknown> = { status: 'IN_PROGRESS' }
    if (patientId) {
      whereCheck.patientId = patientId
    } else {
      whereCheck.userId = session.user.id
    }

    const existing = await prisma.strengthAssessment.findFirst({ where: whereCheck })

    if (existing) {
      return NextResponse.json({
        assessment: existing,
        message: 'Assessment em andamento encontrado'
      })
    }

    // Criar novo assessment
    const assessment = await prisma.strengthAssessment.create({
      data: {
        userId: patientId ? null : session.user.id,
        patientId: patientId || null,
        assessmentType: 'SELF',
        status: 'IN_PROGRESS'
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

// PATCH - Completar assessment e calcular resultados
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, action } = body

    const assessment = await prisma.strengthAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: true
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment não encontrado' }, { status: 404 })
    }

    if (action === 'complete') {
      // Buscar todas as forças
      const strengths = await prisma.characterStrength.findMany({
        where: { active: true }
      })

      // Calcular scores por força
      const scoresByStrength: Record<string, { total: number; count: number }> = {}

      for (const response of assessment.responses) {
        const question = await prisma.strengthQuestion.findUnique({
          where: { id: response.questionId }
        })
        if (!question) continue

        const code = question.strengthCode
        if (!scoresByStrength[code]) {
          scoresByStrength[code] = { total: 0, count: 0 }
        }
        
        const answer = JSON.parse(response.answer)
        const score = typeof answer === 'number' ? answer : answer.value || 0
        scoresByStrength[code].total += score
        scoresByStrength[code].count++
      }

      // Calcular média e criar resultados
      const results: Array<{ strengthId: string; code: string; score: number }> = []

      for (const strength of strengths) {
        const data = scoresByStrength[strength.code]
        const avgScore = data ? data.total / data.count : 3 // Default neutro

        results.push({
          strengthId: strength.id,
          code: strength.code,
          score: avgScore
        })
      }

      // Ordenar por score e atribuir ranks
      results.sort((a, b) => b.score - a.score)

      // Criar resultados no banco
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        await prisma.strengthAssessmentResult.create({
          data: {
            assessmentId,
            strengthId: r.strengthId,
            score: r.score,
            rank: i + 1,
            isTopFive: i < 5,
            isGem: r.score >= 4.5 && i < 3 // Gema se score alto e top 3
          }
        })
      }

      // Atualizar assessment
      const updated = await prisma.strengthAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          results: {
            include: { strength: true },
            orderBy: { rank: 'asc' }
          }
        }
      })

      return NextResponse.json({
        assessment: updated,
        topFive: updated.results.filter(r => r.isTopFive),
        gems: updated.results.filter(r => r.isGem)
      })
    }

    if (action === 'cancel') {
      const updated = await prisma.strengthAssessment.update({
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
