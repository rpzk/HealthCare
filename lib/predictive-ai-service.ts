/**
 * Predictive AI Service
 * 
 * Serviço de IA preditiva para:
 * - Previsão de no-show (faltas)
 * - Recomendação de overbooking
 * - Análise de padrões de agendamento
 * - Sugestão de horários ideais
 * 
 * NOTA: Usa model Consultation
 */

import prisma from '@/lib/prisma'
import { subDays, differenceInYears, getDay, getHours } from 'date-fns'

// ============= Types =============

export interface NoShowPrediction {
  consultationId: string
  patientId: string
  patientName: string
  scheduledDate: Date
  probability: number // 0-1
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskFactors: RiskFactor[]
  recommendedActions: string[]
}

export interface RiskFactor {
  factor: string
  impact: number // -1 to 1
  description: string
}

export interface OverbookingRecommendation {
  date: Date
  slot: string
  currentBookings: number
  recommendedOverbooking: number
  expectedNoShows: number
  confidence: number
}

export interface PatientBehaviorProfile {
  patientId: string
  totalConsultations: number
  attendedConsultations: number
  missedConsultations: number
  cancelledConsultations: number
  attendanceRate: number
  preferredDays: number[]
  preferredHours: number[]
  noShowTrend: 'IMPROVING' | 'STABLE' | 'WORSENING'
}

export interface SchedulingInsights {
  bestDays: { day: number; attendanceRate: number }[]
  bestHours: { hour: number; attendanceRate: number }[]
  highRiskSlots: { day: number; hour: number; noShowRate: number }[]
}

// ============= Service Class =============

export class PredictiveAIService {
  
  async predictNoShow(consultationId: string): Promise<NoShowPrediction | null> {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        doctor: { select: { speciality: true } }
      }
    })

    if (!consultation) return null

    const riskFactors: RiskFactor[] = []
    let totalRisk = 0

    // Histórico do paciente
    const history = await prisma.consultation.findMany({
      where: { patientId: consultation.patientId },
      orderBy: { scheduledDate: 'desc' },
      take: 20
    })

    // Calcular risco baseado em histórico
    const noShows = history.filter(h => h.status === 'NO_SHOW').length
    const historyRate = history.length > 0 ? noShows / history.length : 0
    
    if (historyRate > 0.2) {
      riskFactors.push({
        factor: 'Histórico de faltas',
        impact: historyRate,
        description: `${Math.round(historyRate * 100)}% de faltas anteriores`
      })
      totalRisk += historyRate * 0.35
    }

    // Distância temporal
    const daysUntil = Math.ceil((consultation.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil > 14) {
      const distanceImpact = Math.min(0.3, daysUntil * 0.01)
      riskFactors.push({
        factor: 'Distância temporal',
        impact: distanceImpact,
        description: `Consulta em ${daysUntil} dias`
      })
      totalRisk += distanceImpact * 0.15
    }

    // Horário
    const hour = getHours(consultation.scheduledDate)
    if (hour === 8 || hour >= 17) {
      riskFactors.push({
        factor: 'Horário',
        impact: 0.15,
        description: 'Primeiro ou último horário'
      })
      totalRisk += 0.15 * 0.10
    }

    // Dia da semana
    const day = getDay(consultation.scheduledDate)
    if (day === 1 || day === 5) {
      riskFactors.push({
        factor: 'Dia da semana',
        impact: 0.1,
        description: day === 1 ? 'Segunda-feira' : 'Sexta-feira'
      })
      totalRisk += 0.1 * 0.10
    }

    // Idade do paciente
    const age = consultation.patient.birthDate 
      ? differenceInYears(new Date(), consultation.patient.birthDate)
      : null
    
    if (age && age >= 18 && age < 30) {
      riskFactors.push({
        factor: 'Faixa etária',
        impact: 0.15,
        description: 'Adulto jovem'
      })
      totalRisk += 0.15 * 0.08
    }

    const probability = Math.max(0, Math.min(1, totalRisk))
    const riskLevel = probability < 0.3 ? 'LOW' : probability < 0.6 ? 'MEDIUM' : 'HIGH'

    const recommendedActions = this.getRecommendedActions(probability)

    return {
      consultationId,
      patientId: consultation.patientId,
      patientName: consultation.patient.name,
      scheduledDate: consultation.scheduledDate,
      probability,
      riskLevel,
      riskFactors,
      recommendedActions
    }
  }

  async predictNoShowsBatch(startDate: Date, endDate: Date): Promise<NoShowPrediction[]> {
    const consultations = await prisma.consultation.findMany({
      where: {
        scheduledDate: { gte: startDate, lte: endDate },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      select: { id: true }
    })

    const predictions: NoShowPrediction[] = []
    
    for (const consult of consultations) {
      const prediction = await this.predictNoShow(consult.id)
      if (prediction) predictions.push(prediction)
    }

    return predictions.sort((a, b) => b.probability - a.probability)
  }

  async getOverbookingRecommendations(date: Date): Promise<OverbookingRecommendation[]> {
    const slots = this.generateTimeSlots()
    const recommendations: OverbookingRecommendation[] = []

    for (const slot of slots) {
      const slotStart = new Date(date)
      const [hours, minutes] = slot.split(':').map(Number)
      slotStart.setHours(hours, minutes, 0, 0)
      
      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + 30)

      const bookings = await prisma.consultation.count({
        where: {
          scheduledDate: { gte: slotStart, lt: slotEnd },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      })

      const expectedNoShows = bookings * 0.15
      const recommendedOverbooking = bookings > 3 ? Math.floor(expectedNoShows) : 0

      if (bookings > 0) {
        recommendations.push({
          date,
          slot,
          currentBookings: bookings,
          recommendedOverbooking,
          expectedNoShows: Math.round(expectedNoShows * 10) / 10,
          confidence: 0.75
        })
      }
    }

    return recommendations
  }

  async getPatientBehaviorProfile(patientId: string): Promise<PatientBehaviorProfile | null> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) return null

    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      orderBy: { scheduledDate: 'desc' }
    })

    const total = consultations.length
    if (total === 0) {
      return {
        patientId,
        totalConsultations: 0,
        attendedConsultations: 0,
        missedConsultations: 0,
        cancelledConsultations: 0,
        attendanceRate: 1,
        preferredDays: [],
        preferredHours: [],
        noShowTrend: 'STABLE'
      }
    }

    const attended = consultations.filter(c => c.status === 'COMPLETED').length
    const missed = consultations.filter(c => c.status === 'NO_SHOW').length
    const cancelled = consultations.filter(c => c.status === 'CANCELLED').length

    const attendedConsults = consultations.filter(c => c.status === 'COMPLETED')
    const dayCount = new Map<number, number>()
    const hourCount = new Map<number, number>()
    
    for (const consult of attendedConsults) {
      const d = getDay(consult.scheduledDate)
      const h = getHours(consult.scheduledDate)
      dayCount.set(d, (dayCount.get(d) || 0) + 1)
      hourCount.set(h, (hourCount.get(h) || 0) + 1)
    }

    const preferredDays = [...dayCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0])

    const preferredHours = [...hourCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0])

    const sixMonthsAgo = subDays(new Date(), 180)
    const recent = consultations.filter(c => c.scheduledDate >= sixMonthsAgo)
    const older = consultations.filter(c => c.scheduledDate < sixMonthsAgo)

    const recentRate = recent.length > 0 ? recent.filter(c => c.status === 'NO_SHOW').length / recent.length : 0
    const olderRate = older.length > 0 ? older.filter(c => c.status === 'NO_SHOW').length / older.length : 0

    let noShowTrend: 'IMPROVING' | 'STABLE' | 'WORSENING' = 'STABLE'
    if (older.length >= 3 && recent.length >= 3) {
      const diff = recentRate - olderRate
      if (diff < -0.1) noShowTrend = 'IMPROVING'
      else if (diff > 0.1) noShowTrend = 'WORSENING'
    }

    return {
      patientId,
      totalConsultations: total,
      attendedConsultations: attended,
      missedConsultations: missed,
      cancelledConsultations: cancelled,
      attendanceRate: total > 0 ? attended / total : 1,
      preferredDays,
      preferredHours,
      noShowTrend
    }
  }

  async getSchedulingInsights(periodDays: number = 90): Promise<SchedulingInsights> {
    const startDate = subDays(new Date(), periodDays)
    
    const consultations = await prisma.consultation.findMany({
      where: {
        scheduledDate: { gte: startDate },
        status: { in: ['COMPLETED', 'NO_SHOW'] }
      },
      select: { scheduledDate: true, status: true }
    })

    const dayStats = new Map<number, { total: number; attended: number }>()
    const hourStats = new Map<number, { total: number; attended: number }>()
    const slotStats = new Map<string, { total: number; noShows: number }>()

    for (const consult of consultations) {
      const day = getDay(consult.scheduledDate)
      const hour = getHours(consult.scheduledDate)
      const slotKey = `${day}-${hour}`
      const attended = consult.status === 'COMPLETED'

      const dayData = dayStats.get(day) || { total: 0, attended: 0 }
      dayData.total++
      if (attended) dayData.attended++
      dayStats.set(day, dayData)

      const hourData = hourStats.get(hour) || { total: 0, attended: 0 }
      hourData.total++
      if (attended) hourData.attended++
      hourStats.set(hour, hourData)

      const slotData = slotStats.get(slotKey) || { total: 0, noShows: 0 }
      slotData.total++
      if (!attended) slotData.noShows++
      slotStats.set(slotKey, slotData)
    }

    const bestDays = [...dayStats.entries()]
      .map(([day, stats]) => ({
        day,
        attendanceRate: stats.total > 0 ? stats.attended / stats.total : 0
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate)

    const bestHours = [...hourStats.entries()]
      .map(([hour, stats]) => ({
        hour,
        attendanceRate: stats.total > 0 ? stats.attended / stats.total : 0
      }))
      .filter(h => h.hour >= 7 && h.hour <= 19)
      .sort((a, b) => b.attendanceRate - a.attendanceRate)

    const highRiskSlots = [...slotStats.entries()]
      .map(([key, stats]) => {
        const [day, hour] = key.split('-').map(Number)
        return { day, hour, noShowRate: stats.total > 5 ? stats.noShows / stats.total : 0 }
      })
      .filter(s => s.noShowRate > 0.2)
      .sort((a, b) => b.noShowRate - a.noShowRate)
      .slice(0, 10)

    return { bestDays, bestHours, highRiskSlots }
  }

  private getRecommendedActions(probability: number): string[] {
    const actions: string[] = []
    if (probability > 0.6) {
      actions.push('Enviar lembrete por WhatsApp 48h antes')
      actions.push('Ligar para confirmar no dia anterior')
      actions.push('Considerar overbooking')
    } else if (probability > 0.3) {
      actions.push('Enviar lembrete por SMS 24h antes')
      actions.push('Confirmar por WhatsApp no dia')
    } else {
      actions.push('Lembrete automático padrão')
    }
    return actions
  }

  private generateTimeSlots(): string[] {
    const slots: string[] = []
    for (let h = 8; h < 18; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`)
      slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return slots
  }
}

export const predictiveAIService = new PredictiveAIService()
