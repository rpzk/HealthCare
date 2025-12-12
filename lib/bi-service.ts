import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns'

export class BIService {
  /**
   * KPIs principais do dashboard
   */
  static async getKeyMetrics(startDate?: Date, endDate?: Date) {
    const start = startDate || startOfMonth(new Date())
    const end = endDate || endOfMonth(new Date())

    const [
      totalPatients,
      totalConsultations,
      totalDoctors,
      consultationsThisMonth,
      npsScore
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.consultation.count(),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: start,
            lte: end
          }
        }
      }),
      this.getNPSScore(start, end)
    ])

    return {
      totalPatients,
      totalConsultations,
      totalDoctors,
      consultationsThisMonth,
      revenue: 0, // Payment model não existe, usar 0 como placeholder
      npsScore
    }
  }

  static async getPatientsByRisk() {
    const result = await prisma.patient.groupBy({
      by: ['riskLevel'],
      _count: {
        id: true
      }
    })

    return result.map((item: any) => ({
      name: item.riskLevel,
      value: item._count.id
    }))
  }

  static async getConsultationsLast6Months() {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      
      const count = await prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      months.push({
        month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        count
      })
    }

    return months
  }

  /**
   * Consultas por médico
   */
  static async getConsultationsByDoctor(startDate: Date, endDate: Date) {
    const consultations = await prisma.consultation.groupBy({
      by: ['doctorId'],
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true }
    })

    const doctorDetails = await Promise.all(
      consultations.map(async (c: any) => {
        const doctor = await prisma.user.findUnique({
          where: { id: c.doctorId! },
          select: { name: true }
        })
        return {
          doctorName: doctor?.name || 'Desconhecido',
          count: c._count.id
        }
      })
    )

    return doctorDetails
  }

  /**
   * Receita por método de pagamento (placeholder - modelo não existe)
   */
  static async getRevenueByPaymentMethod(startDate: Date, endDate: Date) {
    // Payment model não existe no schema
    // Retornar dados vazios como placeholder
    return [
      { method: 'Não disponível', amount: 0 }
    ]
  }

  /**
   * Taxa de no-show
   */
  static async getNoShowRate(startDate: Date, endDate: Date) {
    const [total, noShows] = await Promise.all([
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          },
          status: 'NO_SHOW'
        }
      })
    ])

    return {
      total,
      noShows,
      rate: total > 0 ? (noShows / total) * 100 : 0
    }
  }

  /**
   * Horários de pico
   */
  static async getPeakHours(startDate: Date, endDate: Date) {
    const consultations = await prisma.consultation.findMany({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { scheduledDate: true }
    })

    const hourCounts = new Map<number, number>()
    consultations.forEach(c => {
      const hour = c.scheduledDate.getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    })

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour)
  }

  /**
   * NPS Score
   */
  static async getNPSScore(startDate: Date, endDate: Date) {
    const responses = await prisma.npsResponse.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        category: true
      }
    })

    if (responses.length === 0) return 0

    const promoters = responses.filter(r => r.category === 'PROMOTER').length
    const detractors = responses.filter(r => r.category === 'DETRACTOR').length

    return Math.round(((promoters - detractors) / responses.length) * 100)
  }

  /**
   * Certificados emitidos
   */
  static async getCertificateStats(startDate: Date, endDate: Date) {
    const certificates = await prisma.medicalCertificate.groupBy({
      by: ['type'],
      where: {
        issuedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true }
    })

    return certificates.map((c: any) => ({
      type: c.type,
      count: c._count.id
    }))
  }

  /**
   * Dashboard completo
   */
  static async getDashboardOverview(period: 'today' | 'week' | 'month' = 'month') {
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'today':
        startDate = startOfDay(new Date())
        endDate = endOfDay(new Date())
        break
      case 'week':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
        break
    }

    const [
      keyMetrics,
      consultationsByDoctor,
      revenueByPaymentMethod,
      noShowRate,
      peakHours,
      certificateStats
    ] = await Promise.all([
      this.getKeyMetrics(startDate, endDate),
      this.getConsultationsByDoctor(startDate, endDate),
      this.getRevenueByPaymentMethod(startDate, endDate),
      this.getNoShowRate(startDate, endDate),
      this.getPeakHours(startDate, endDate),
      this.getCertificateStats(startDate, endDate)
    ])

    return {
      period,
      startDate,
      endDate,
      keyMetrics,
      consultationsByDoctor,
      revenueByPaymentMethod,
      noShowRate,
      peakHours,
      certificateStats,
      generatedAt: new Date()
    }
  }
}
