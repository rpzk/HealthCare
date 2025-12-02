import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Estatísticas agregadas de desenvolvimento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    const whereClause = patientId 
      ? { patientId }
      : { userId: session.user.id }

    // Buscar assessments de stratum
    const stratumAssessments = await prisma.stratumAssessment.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        calculatedStratum: true,
        timeSpanMonths: true,
        confidenceScore: true,
        completedAt: true,
      },
    })

    // Buscar assessments de forças
    const strengthAssessments = await prisma.strengthAssessment.findMany({
      where: whereClause,
      orderBy: { completedAt: 'asc' },
      include: {
        results: {
          orderBy: { score: 'desc' },
          take: 5,
          include: {
            strength: true,
          },
        },
      },
    })

    // Buscar planos
    const plans = await prisma.developmentPlan.findMany({
      where: whereClause,
      include: {
        goals: {
          include: { actions: true },
        },
        milestones: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular estatísticas
    const totalGoals = plans.reduce((sum, p) => sum + p.goals.length, 0)
    const completedGoals = plans.reduce(
      (sum, p) => sum + p.goals.filter(g => g.status === 'COMPLETED').length, 
      0
    )
    
    const totalActions = plans.reduce(
      (sum, p) => sum + p.goals.reduce((s, g) => s + g.actions.length, 0), 
      0
    )
    const completedActions = plans.reduce(
      (sum, p) => sum + p.goals.reduce((s, g) => s + g.actions.filter(a => a.completed).length, 0),
      0
    )

    const totalMilestones = plans.reduce((sum, p) => sum + p.milestones.length, 0)
    const achievedMilestones = plans.reduce(
      (sum, p) => sum + p.milestones.filter(m => m.achieved).length,
      0
    )

    // Evolução do stratum ao longo do tempo
    const stratumEvolution = stratumAssessments.map(a => ({
      date: a.completedAt,
      level: a.calculatedStratum,
      months: a.timeSpanMonths,
      confidence: a.confidenceScore,
    }))

    // Top forças mais recentes
    const latestStrengths = strengthAssessments.length > 0
      ? strengthAssessments[strengthAssessments.length - 1].results.map(r => ({
          code: r.strength.code,
          name: r.strength.name,
          score: r.score,
          virtue: r.strength.virtue,
        }))
      : []

    // Progresso por categoria de metas
    const categoryProgress: Record<string, { total: number; completed: number }> = {}
    plans.forEach(p => {
      p.goals.forEach(g => {
        if (!categoryProgress[g.category]) {
          categoryProgress[g.category] = { total: 0, completed: 0 }
        }
        categoryProgress[g.category].total++
        if (g.status === 'COMPLETED') {
          categoryProgress[g.category].completed++
        }
      })
    })

    // Streak de dias consecutivos com ações completadas
    // (simplificado - apenas conta total de ações completadas esta semana)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const recentActions = plans.flatMap(p => 
      p.goals.flatMap(g => 
        g.actions.filter(a => 
          a.completed && 
          a.completedAt && 
          new Date(a.completedAt) >= weekAgo
        )
      )
    )

    const stats = {
      overview: {
        totalAssessments: stratumAssessments.length + strengthAssessments.length,
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.status === 'ACTIVE').length,
      },
      goals: {
        total: totalGoals,
        completed: completedGoals,
        progress: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      },
      actions: {
        total: totalActions,
        completed: completedActions,
        progress: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        thisWeek: recentActions.length,
      },
      milestones: {
        total: totalMilestones,
        achieved: achievedMilestones,
      },
      stratum: {
        current: stratumAssessments.length > 0 
          ? stratumAssessments[stratumAssessments.length - 1].calculatedStratum 
          : null,
        evolution: stratumEvolution,
      },
      strengths: {
        top5: latestStrengths,
        assessmentCount: strengthAssessments.length,
      },
      categoryProgress: Object.entries(categoryProgress).map(([category, data]) => ({
        category,
        ...data,
        progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar estatísticas:')
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de desenvolvimento' },
      { status: 500 }
    )
  }
}
