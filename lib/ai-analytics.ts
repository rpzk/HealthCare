import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface AIAnalytics {
  totalAnalyses: number
  symptomAnalyses: number
  drugInteractions: number
  medicalSummaries: number
  criticalAlerts: number
  // Derived from real AIAnalysis.confidence when available; 0 means no data
  accuracyRate: number
  topSymptoms: Array<{ symptom: string; count: number }>
  topDiagnoses: Array<{ diagnosis: string; count: number }>
  interactionsBySeverity: {
    mild: number
    moderate: number
    severe: number
  }
  dailyUsage: Array<{ date: string; analyses: number }>
  responseTime: {
    average: number | null
    fastest: number | null
    slowest: number | null
  }
}

type AiUsageType = 'symptom_analysis' | 'drug_interaction' | 'medical_summary'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function confidenceToPercent(avg: number | null): number {
  if (!avg || !isFinite(avg)) return 0
  // Heuristic: some pipelines store confidence as 0..1, others as 0..100
  const pct = avg <= 1 ? avg * 100 : avg
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10))
}

function extractDurationMs(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  const candidate = m.durationMs ?? m.responseTimeMs ?? m.latencyMs
  if (typeof candidate === 'number' && isFinite(candidate) && candidate >= 0) return candidate
  if (typeof candidate === 'string') {
    const parsed = Number(candidate)
    if (isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

export class AIAnalyticsService {
  // Buscar estatísticas completas de IA
  static async getAIAnalytics(dateFrom?: Date, dateTo?: Date): Promise<AIAnalytics> {
    const startDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias atrás
    const endDate = dateTo || new Date()

    try {
      const from = startOfDay(startDate)
      const to = endDate

      // AIQuotaUsage is our real, durable counter source.
      const quotaRows = await prisma.aIQuotaUsage.findMany({
        where: {
          date: { gte: from, lte: to },
          type: { in: ['symptom_analysis', 'drug_interaction', 'medical_summary'] }
        },
        select: { type: true, date: true, count: true }
      })

      const totalsByType: Record<string, number> = { symptom_analysis: 0, drug_interaction: 0, medical_summary: 0 }
      const dailyMap = new Map<string, number>()
      for (const row of quotaRows) {
        const t = row.type
        const c = row.count || 0
        if (t in totalsByType) totalsByType[t] += c
        const k = dateKey(row.date)
        dailyMap.set(k, (dailyMap.get(k) || 0) + c)
      }

      // Confidence/latency from AIAnalysis when available (real data)
      const analyses = await prisma.aIAnalysis.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { confidence: true, metadata: true }
      })
      const confidences = analyses.map((a) => a.confidence).filter((n) => typeof n === 'number' && isFinite(n)) as number[]
      const avgConfidence = confidences.length ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) : null

      const durations = analyses
        .map((a) => extractDurationMs(a.metadata))
        .filter((n): n is number => typeof n === 'number' && isFinite(n))
      const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
      const minDuration = durations.length ? Math.min(...durations) : null
      const maxDuration = durations.length ? Math.max(...durations) : null

      // Build daily series covering the full range, filling gaps with 0 (absence of records)
      const days: Array<{ date: string; analyses: number }> = []
      const cursor = new Date(from)
      const endDay = startOfDay(to)
      while (cursor <= endDay) {
        const k = dateKey(cursor)
        days.push({ date: k, analyses: dailyMap.get(k) || 0 })
        cursor.setDate(cursor.getDate() + 1)
      }

      const symptomAnalyses = totalsByType.symptom_analysis
      const drugInteractions = totalsByType.drug_interaction
      const medicalSummaries = totalsByType.medical_summary

      return {
        totalAnalyses: symptomAnalyses + drugInteractions + medicalSummaries,
        symptomAnalyses,
        drugInteractions,
        medicalSummaries,
        criticalAlerts: 0,
        accuracyRate: confidenceToPercent(avgConfidence),
        topSymptoms: [],
        topDiagnoses: [],
        interactionsBySeverity: { mild: 0, moderate: 0, severe: 0 },
        dailyUsage: days,
        responseTime: {
          average: avgDuration,
          fastest: minDuration,
          slowest: maxDuration,
        },
      }
    } catch (error) {
      logger.error({ error }, 'Erro ao buscar analytics de IA')
      throw new Error('Erro ao buscar estatísticas de IA')
    }
  }

  // Registrar uso da IA (para estatísticas reais)
  static async logAIUsage(
    type: AiUsageType,
    patientId?: string,
    doctorId?: string,
    responseTime?: number,
    metadata?: Record<string, unknown>
  ) {
    try {
      // Persist usage counters (real) in AIQuotaUsage
      const today = startOfDay(new Date())
      await prisma.aIQuotaUsage.upsert({
        where: { userId_type_date: { userId: doctorId || 'unknown', type, date: today } },
        create: {
          userId: doctorId || 'unknown',
          type,
          date: today,
          count: 1,
        },
        update: {
          count: { increment: 1 },
        },
      })

      logger.debug({ type, patientId, doctorId, responseTime, metadata }, 'AI Usage logged')
      return true
    } catch (error) {
      logger.error({ error }, 'Erro ao registrar uso da IA')
      return false
    }
  }

  // Buscar estatísticas por médico
  static async getDoctorAIStats(doctorId: string) {
    try {
      const from = startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      const rows = await prisma.aIQuotaUsage.findMany({
        where: {
          userId: doctorId,
          date: { gte: from },
          type: { in: ['symptom_analysis', 'drug_interaction', 'medical_summary'] },
        },
        select: { type: true, count: true },
      })

      const totals: Record<string, number> = { symptom_analysis: 0, drug_interaction: 0, medical_summary: 0 }
      for (const r of rows) totals[r.type] = (totals[r.type] || 0) + (r.count || 0)

      const symptomAnalyses = totals.symptom_analysis
      const drugChecks = totals.drug_interaction
      const summariesGenerated = totals.medical_summary
      const totalUsage = symptomAnalyses + drugChecks + summariesGenerated

      const favoriteFeatures = [
        { feature: 'Análise de Sintomas', usage: symptomAnalyses },
        { feature: 'Interações Medicamentosas', usage: drugChecks },
        { feature: 'Resumos Automáticos', usage: summariesGenerated },
      ].filter((f) => f.usage > 0)

      return {
        totalUsage,
        symptomAnalyses,
        drugChecks,
        summariesGenerated,
        averageResponseTime: null,
        accuracyFeedback: null,
        favoriteFeatures,
      }
    } catch (error) {
      logger.error({ error, doctorId }, 'Erro ao buscar stats do médico')
      throw error
    }
  }

  // Obter métricas de performance em tempo real
  static async getPerformanceMetrics() {
    // Only return real, queryable signals; avoid hardcoded values.
    const start = Date.now()
    const today = startOfDay(new Date())
    const todayUsage = await prisma.aIQuotaUsage.aggregate({
      where: { date: { gte: today } },
      _sum: { count: true },
    })
    const dbMs = Date.now() - start
    return {
      aiServiceStatus: 'online',
      dbQueryMs: dbMs,
      todayUsage: todayUsage._sum.count || 0,
    }
  }

  // Buscar tendências de diagnósticos
  static async getDiagnosisTrends(period: 'week' | 'month' | 'quarter') {
    const days = period === 'week' ? 7 : period === 'quarter' ? 90 : 30
    const now = new Date()
    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousFrom = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000)

    const [current, previous] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where: { createdAt: { gte: currentFrom, lte: now } },
        select: { suggestions: true },
      }),
      prisma.aIAnalysis.findMany({
        where: { createdAt: { gte: previousFrom, lt: currentFrom } },
        select: { suggestions: true },
      }),
    ])

    const countSuggestions = (rows: Array<{ suggestions: string[] }>) => {
      const map = new Map<string, number>()
      for (const r of rows) {
        for (const s of r.suggestions || []) {
          const key = String(s).trim()
          if (!key) continue
          map.set(key, (map.get(key) || 0) + 1)
        }
      }
      return map
    }

    const cur = countSuggestions(current)
    const prev = countSuggestions(previous)
    const allKeys = Array.from(cur.keys())

    return allKeys
      .map((diagnosis) => {
        const cases = cur.get(diagnosis) || 0
        const prevCases = prev.get(diagnosis) || 0
        const trendPct = prevCases === 0 ? (cases === 0 ? 0 : 100) : ((cases - prevCases) / prevCases) * 100
        const trend = `${trendPct >= 0 ? '+' : ''}${Math.round(trendPct)}%`
        return { diagnosis, trend, cases }
      })
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 10)
  }

  // Alertas e recomendações do sistema
  static async getSystemRecommendations() {
    // Only return recommendations derived from real data sources.
    // For now, no computed recommendation engine is available.
    return []
  }
}
