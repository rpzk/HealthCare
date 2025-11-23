import { prisma } from '@/lib/prisma'

export class BIService {
  static async getKeyMetrics() {
    const [
      totalPatients,
      totalConsultations,
      totalDoctors,
      consultationsThisMonth
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.consultation.count(),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ])

    return {
      totalPatients,
      totalConsultations,
      totalDoctors,
      consultationsThisMonth
    }
  }

  static async getPatientsByRisk() {
    const result = await prisma.patient.groupBy({
      by: ['riskLevel'],
      _count: {
        _all: true
      }
    })

    return result.map(item => ({
      name: item.riskLevel,
      value: item._count._all
    }))
  }

  static async getConsultationsLast6Months() {
    // This is a simplified version. In a real BI tool, we might use raw SQL for better date truncation
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const consultations = await prisma.consultation.findMany({
      where: {
        scheduledDate: {
          gte: sixMonthsAgo
        }
      },
      select: {
        scheduledDate: true
      }
    })

    // Group by month in JS
    const grouped = consultations.reduce((acc, curr) => {
      const month = curr.scheduledDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }
}
