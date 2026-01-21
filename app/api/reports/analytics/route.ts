import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfYear, subMonths, format } from 'date-fns'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'


export const GET = withAuth(async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month' // month, year, custom
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    let dateRange: { start: Date; end: Date }

    if (period === 'custom' && startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else if (period === 'year') {
      dateRange = {
        start: startOfYear(new Date()),
        end: new Date()
      }
    } else {
      // Default to current month
      dateRange = {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      }
    }

    // Get financial data
    const [transactions, consultations, patients] = await Promise.all([
      // Financial transactions
      prisma.financialTransaction.findMany({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          status: true,
          dueDate: true,
          paidDate: true,
          createdAt: true
        }
      }),

      // Consultations
      prisma.consultation.findMany({
        where: {
          scheduledDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        select: {
          id: true,
          status: true,
          type: true,
          scheduledDate: true,
          doctor: {
            select: {
              id: true,
              name: true,
              speciality: true
            }
          }
        }
      }),

      // New patients
      prisma.patient.findMany({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        select: {
          id: true,
          createdAt: true
        }
      })
    ])

    // Calculate financial summary
    const paidTransactions = transactions.filter(t => t.status === 'PAID')
    const income = paidTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = paidTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Revenue by category
    const revenueByCategory = paidTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
        return acc
      }, {} as Record<string, number>)

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      
      const monthTransactions = await prisma.financialTransaction.findMany({
        where: {
          paidDate: { gte: monthStart, lte: monthEnd },
          status: 'PAID',
          type: 'INCOME'
        }
      })

      const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      
      monthlyRevenue.push({
        month: format(monthStart, 'MMM/yy'),
        revenue: total
      })
    }

    // Consultations by status
    const consultationsByStatus = consultations.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Consultations by doctor
    const consultationsByDoctor = consultations.reduce((acc, c) => {
      const doctorName = c.doctor?.name || 'Desconhecido'
      if (!acc[doctorName]) {
        acc[doctorName] = { name: doctorName, count: 0, speciality: c.doctor?.speciality || '' }
      }
      acc[doctorName].count++
      return acc
    }, {} as Record<string, { name: string; count: number; speciality: string }>)

    // Patient satisfaction - implementar com dados reais de pesquisa
    const satisfactionScores: Array<{ aspect: string; score: number }> = []

    return NextResponse.json({
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      financial: {
        income,
        expenses,
        balance: income - expenses,
        revenueByCategory: Object.entries(revenueByCategory).map(([category, amount]) => ({
          category,
          amount
        })),
        monthlyRevenue
      },
      consultations: {
        total: consultations.length,
        byStatus: Object.entries(consultationsByStatus).map(([status, count]) => ({
          status,
          count
        })),
        byDoctor: Object.values(consultationsByDoctor),
        completed: consultations.filter(c => c.status === 'COMPLETED').length,
        cancelled: consultations.filter(c => c.status === 'CANCELLED').length
      },
      patients: {
        newPatients: patients.length,
        total: await prisma.patient.count()
      },
      satisfaction: satisfactionScores
    })
  } catch (error) {
    logger.error('Error generating analytics:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatórios' },
      { status: 500 }
    )
  }
})
