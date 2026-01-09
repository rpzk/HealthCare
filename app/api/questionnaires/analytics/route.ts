import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obter métricas analíticas de questionários
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'

    // Calcular data inicial baseado no período
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Buscar questionários do período
    const questionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        sentAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        template: true,
      },
    })

    // Calcular métricas
    const totalSent = questionnaires.length
    const completed = questionnaires.filter(q => q.status === 'COMPLETED').length
    const pending = questionnaires.filter(
      q => q.status === 'PENDING' || q.status === 'IN_PROGRESS'
    ).length
    const expired = questionnaires.filter(q => q.status === 'EXPIRED').length
    const analyzed = questionnaires.filter(q => q.aiAnalysis).length

    const completionRate = totalSent > 0 ? (completed / totalSent) * 100 : 0

    // Calcular tempo médio de preenchimento
    const completedQuestionnaires = questionnaires.filter(
      q => q.completedAt && q.sentAt
    )
    const averageTime =
      completedQuestionnaires.length > 0
        ? completedQuestionnaires.reduce((acc, q) => {
            const sent = new Date(q.sentAt).getTime()
            const completed = new Date(q.completedAt!).getTime()
            return acc + (completed - sent) / (1000 * 60) // em minutos
          }, 0) / completedQuestionnaires.length
        : 0

    // Agrupar por sistema terapêutico
    const systemBreakdown = Array.from(
      new Set(questionnaires.map(q => q.template?.therapeuticSystem || 'Geral'))
    ).map(system => {
      const systemQuestionnaires = questionnaires.filter(
        q => (q.template?.therapeuticSystem || 'Geral') === system
      )
      const systemCompleted = systemQuestionnaires.filter(
        q => q.status === 'COMPLETED'
      ).length

      return {
        system,
        count: systemQuestionnaires.length,
        completion:
          systemQuestionnaires.length > 0
            ? (systemCompleted / systemQuestionnaires.length) * 100
            : 0,
      }
    })

    // Tendência ao longo do tempo
    const trends: Array<{
      date: string
      sent: number
      completed: number
    }> = []

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      const dateStr = date.toLocaleDateString('pt-BR')

      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const daySent = questionnaires.filter(
        q => new Date(q.sentAt) >= dayStart && new Date(q.sentAt) <= dayEnd
      ).length

      const dayCompleted = questionnaires.filter(
        q =>
          q.status === 'COMPLETED' &&
          q.completedAt &&
          new Date(q.completedAt) >= dayStart &&
          new Date(q.completedAt) <= dayEnd
      ).length

      trends.push({
        date: dateStr,
        sent: daySent,
        completed: dayCompleted,
      })
    }

    return NextResponse.json({
      totalSent,
      completed,
      pending,
      expired,
      analyzed,
      completionRate,
      averageTime,
      systemBreakdown,
      trends,
    })
  } catch (error: any) {
    console.error('Erro ao buscar analíticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar analíticas' },
      { status: 500 }
    )
  }
}
