import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Salvar resposta de uma questão
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, questionId, answer } = body

    // Verificar se o assessment pertence ao usuário
    const assessment = await prisma.stratumAssessment.findUnique({
      where: { id: assessmentId }
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

    // Buscar a questão para calcular o score
    const question = await prisma.stratumQuestion.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    // Calcular time span e score baseado na resposta
    const stratumMapping = JSON.parse(question.stratumMapping)
    const timeSpanValue = stratumMapping[answer]?.timeSpanMonths || null
    const score = stratumMapping[answer]?.score || null

    // Upsert da resposta
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
        score
      }
    })

    // Calcular progresso
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
    console.error('Erro ao salvar resposta:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar resposta' },
      { status: 500 }
    )
  }
}
