import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/development/analytics - Aggregated analytics for managers
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') || 'all' // 'patients', 'staff', 'all'
  const period = searchParams.get('period') || '12' // months
  const periodMonths = parseInt(period)

  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - periodMonths)

    // Get all completed stratum assessments
    const stratumAssessments = await prisma.stratumAssessment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Get all completed strength assessments
    const strengthAssessments = await prisma.strengthAssessment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      include: {
        results: {
          where: { isTopFive: true },
          include: { strength: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Get all development plans
    const developmentPlans = await prisma.developmentPlan.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        goals: true,
        milestones: true,
      },
    })

    // === STRATUM DISTRIBUTION ===
    const stratumDistribution: Record<string, number> = {
      S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0, S7: 0, S8: 0,
    }
    
    // Get latest assessment per user
    const latestStratumByUser = new Map<string, typeof stratumAssessments[0]>()
    for (const assessment of stratumAssessments) {
      if (assessment.userId && !latestStratumByUser.has(assessment.userId)) {
        latestStratumByUser.set(assessment.userId, assessment)
      }
    }
    
    for (const assessment of latestStratumByUser.values()) {
      if (assessment.calculatedStratum) {
        stratumDistribution[assessment.calculatedStratum] = 
          (stratumDistribution[assessment.calculatedStratum] || 0) + 1
      }
    }

    // === STRATUM EVOLUTION OVER TIME ===
    const stratumEvolution: Array<{ month: string; average: number; count: number }> = []
    const monthlyData = new Map<string, { total: number; count: number }>()
    
    for (const assessment of stratumAssessments) {
      if (assessment.completedAt && assessment.timeSpanMonths) {
        const monthKey = assessment.completedAt.toISOString().slice(0, 7)
        const existing = monthlyData.get(monthKey) || { total: 0, count: 0 }
        monthlyData.set(monthKey, {
          total: existing.total + assessment.timeSpanMonths,
          count: existing.count + 1,
        })
      }
    }
    
    // Sort by month and calculate averages
    const sortedMonths = Array.from(monthlyData.keys()).sort()
    for (const month of sortedMonths) {
      const data = monthlyData.get(month)!
      stratumEvolution.push({
        month,
        average: Math.round(data.total / data.count),
        count: data.count,
      })
    }

    // === TOP STRENGTHS ACROSS ORGANIZATION ===
    const strengthCounts: Record<string, { count: number; name: string; virtue: string }> = {}
    
    for (const assessment of strengthAssessments) {
      for (const result of assessment.results) {
        const code = result.strength.code
        if (!strengthCounts[code]) {
          strengthCounts[code] = {
            count: 0,
            name: result.strength.name,
            virtue: result.strength.virtue,
          }
        }
        strengthCounts[code].count++
      }
    }
    
    const topStrengths = Object.entries(strengthCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([code, data]) => ({
        code,
        name: data.name,
        virtue: data.virtue,
        count: data.count,
        percentage: Math.round((data.count / strengthAssessments.length) * 100),
      }))

    // === VIRTUE DISTRIBUTION ===
    const virtueDistribution: Record<string, number> = {}
    
    for (const assessment of strengthAssessments) {
      for (const result of assessment.results) {
        const virtue = result.strength.virtue
        virtueDistribution[virtue] = (virtueDistribution[virtue] || 0) + 1
      }
    }

    // === PLAN METRICS ===
    const planMetrics = {
      total: developmentPlans.length,
      active: developmentPlans.filter(p => p.status === 'ACTIVE').length,
      completed: developmentPlans.filter(p => p.status === 'COMPLETED').length,
      totalGoals: developmentPlans.reduce((sum, p) => sum + p.goals.length, 0),
      completedGoals: developmentPlans.reduce(
        (sum, p) => sum + p.goals.filter(g => g.status === 'COMPLETED').length, 0
      ),
      totalMilestones: developmentPlans.reduce((sum, p) => sum + p.milestones.length, 0),
      achievedMilestones: developmentPlans.reduce(
        (sum, p) => sum + p.milestones.filter(m => m.achieved).length, 0
      ),
    }

    // === GOAL CATEGORIES DISTRIBUTION ===
    const goalCategories: Record<string, number> = {}
    for (const plan of developmentPlans) {
      for (const goal of plan.goals) {
        goalCategories[goal.category] = (goalCategories[goal.category] || 0) + 1
      }
    }

    // === INSIGHTS ===
    const insights: string[] = []
    
    // Most common stratum
    const mostCommonStratum = Object.entries(stratumDistribution)
      .sort(([, a], [, b]) => b - a)[0]
    if (mostCommonStratum[1] > 0) {
      insights.push(`A maioria da equipe está no estrato ${mostCommonStratum[0]} (${mostCommonStratum[1]} pessoas)`)
    }
    
    // Time span trend
    if (stratumEvolution.length >= 2) {
      const firstMonth = stratumEvolution[0].average
      const lastMonth = stratumEvolution[stratumEvolution.length - 1].average
      if (lastMonth > firstMonth) {
        insights.push(`Horizonte temporal médio cresceu ${Math.round(((lastMonth - firstMonth) / firstMonth) * 100)}% no período`)
      }
    }
    
    // Top strength
    if (topStrengths.length > 0) {
      insights.push(`A força mais comum é ${topStrengths[0].name} (${topStrengths[0].percentage}% da equipe)`)
    }
    
    // Goal completion rate
    if (planMetrics.totalGoals > 0) {
      const completionRate = Math.round((planMetrics.completedGoals / planMetrics.totalGoals) * 100)
      insights.push(`Taxa de conclusão de metas: ${completionRate}%`)
    }

    // === PENDING REASSESSMENTS ===
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const usersNeedingReassessment = Array.from(latestStratumByUser.entries())
      .filter(([, assessment]) => assessment.completedAt && assessment.completedAt < oneYearAgo)
      .map(([userId, assessment]) => ({
        userId,
        userName: assessment.user?.name,
        lastAssessment: assessment.completedAt,
        daysSince: Math.floor((Date.now() - (assessment.completedAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
      }))

    return NextResponse.json({
      summary: {
        totalAssessments: stratumAssessments.length,
        uniqueUsers: latestStratumByUser.size,
        strengthAssessments: strengthAssessments.length,
        developmentPlans: planMetrics.total,
        period: `${periodMonths} meses`,
      },
      stratumDistribution,
      stratumEvolution,
      topStrengths,
      virtueDistribution,
      planMetrics,
      goalCategories,
      insights,
      pendingReassessments: usersNeedingReassessment,
    })
  } catch (error) {
    console.error('Error generating analytics:', error)
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 })
  }
}
