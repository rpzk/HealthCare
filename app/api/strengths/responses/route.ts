import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Salvar resposta de uma questão de forças
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, questionId, answer } = body

    const assessment = await prisma.strengthAssessment.findUnique({
      where: { id: assessmentId }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment não encontrado' }, { status: 404 })
    }

    if (assessment.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Assessment não está em andamento' }, { status: 400 })
    }

    // Calcular score
    const score = typeof answer === 'number' ? answer : (answer.value || 3)

    // Upsert da resposta
    const response = await prisma.strengthAssessmentResponse.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId,
          questionId
        }
      },
      update: {
        answer: JSON.stringify(answer),
        score,
        answeredAt: new Date()
      },
      create: {
        assessmentId,
        questionId,
        answer: JSON.stringify(answer),
        score
      }
    })

    // Calcular progresso
    const totalQuestions = await prisma.strengthQuestion.count({
      where: { active: true }
    })
    const answeredQuestions = await prisma.strengthAssessmentResponse.count({
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
    console.error('Erro ao salvar resposta:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar resposta' },
      { status: 500 }
    )
  }
}
