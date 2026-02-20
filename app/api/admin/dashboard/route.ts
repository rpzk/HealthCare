/**
 * API Dashboard Administrativo
 * GET /api/admin/dashboard
 * Retorna métricas gerenciais reais
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas admin pode acessar
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // Calcular datas baseado no período
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    let previousEndDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        previousStartDate = new Date(startDate)
        previousStartDate.setDate(previousStartDate.getDate() - 1)
        previousEndDate = startDate
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        previousStartDate = new Date(startDate)
        previousStartDate.setDate(previousStartDate.getDate() - 7)
        previousEndDate = startDate
        break
      case 'quarter':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 3)
        previousStartDate = new Date(startDate)
        previousStartDate.setMonth(previousStartDate.getMonth() - 3)
        previousEndDate = startDate
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        previousEndDate = startDate
        break
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEndDate = startDate
    }

    // Buscar dados em paralelo
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      previousMonthUsers,
      totalPatients,
      newPatientsThisPeriod,
      previousPeriodPatients,
      consultationsThisPeriod,
      consultationsToday,
      previousPeriodConsultations,
      cancelledConsultations,
      noShowConsultations,
      topProfessionals,
      lowStockItems,
      systemHealth
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),
      
      // Usuários ativos
      prisma.user.count({ where: { isActive: true } }),
      
      // Novos usuários no período
      prisma.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Usuários período anterior
      prisma.user.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: previousEndDate
          } 
        }
      }),
      
      // Total de pacientes
      prisma.patient.count(),
      
      // Novos pacientes no período
      prisma.patient.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Pacientes período anterior
      prisma.patient.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: previousEndDate
          } 
        }
      }),
      
      // Consultas no período
      prisma.consultation.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Consultas hoje
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        }
      }),
      
      // Consultas período anterior
      prisma.consultation.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: previousEndDate
          } 
        }
      }),
      
      // Consultas canceladas no período
      prisma.consultation.count({
        where: {
          createdAt: { gte: startDate },
          status: 'CANCELLED'
        }
      }),
      
      // No-shows (agendadas que passaram sem status de concluída)
      prisma.consultation.count({
        where: {
          scheduledDate: { 
            gte: startDate,
            lt: now
          },
          status: 'SCHEDULED'
        }
      }),
      
      // Top profissionais por atendimentos
      prisma.consultation.groupBy({
        by: ['doctorId'],
        where: { 
          createdAt: { gte: startDate },
          status: { in: ['COMPLETED', 'IN_PROGRESS'] }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      
      // Itens com estoque baixo - usando raw query para comparar quantity com minStock do produto
      prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count 
        FROM inventory i 
        JOIN products p ON i."productId" = p.id 
        WHERE i.quantity <= p."minStock" AND p."minStock" > 0
      `.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      
      // Health check básico
      prisma.$queryRaw`SELECT 1`.then(() => 'healthy').catch(() => 'critical')
    ])

    // Buscar dados dos top profissionais
    const professionalIds = topProfessionals.map((p: { doctorId: string }) => p.doctorId)
    const professionals = professionalIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: professionalIds } },
          select: { id: true, name: true, speciality: true, role: true }
        })
      : []

    const professionalMap = new Map(professionals.map((p: { id: string; name: string | null; speciality: string | null; role: string }) => [p.id, p]))

    // Calcular métricas
    const totalConsultationsThisPeriod = consultationsThisPeriod
    const cancellationRate = totalConsultationsThisPeriod > 0
      ? Math.round((cancelledConsultations / totalConsultationsThisPeriod) * 100)
      : null
    const noShowRate = totalConsultationsThisPeriod > 0
      ? Math.round((noShowConsultations / totalConsultationsThisPeriod) * 100)
      : null

    // Calcular crescimento
    const patientGrowth = previousPeriodPatients > 0
      ? Math.round(((newPatientsThisPeriod - previousPeriodPatients) / previousPeriodPatients) * 100)
      : null

    const consultationGrowth = previousPeriodConsultations > 0
      ? Math.round(((consultationsThisPeriod - previousPeriodConsultations) / previousPeriodConsultations) * 100)
      : null

    const userGrowth = previousMonthUsers > 0
      ? Math.round(((newUsersThisMonth - previousMonthUsers) / previousMonthUsers) * 100)
      : null

    // Calcular dias no período para média
    const daysInPeriod = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const avgConsultationsPerDay = Math.round(consultationsThisPeriod / daysInPeriod)

    // Montar alertas reais
    const alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string }> = []
    
    if (lowStockItems > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'warning',
        message: `${lowStockItems} ${lowStockItems === 1 ? 'item' : 'itens'} com estoque baixo`
      })
    }

    if (typeof noShowRate === 'number' && noShowRate > 10) {
      alerts.push({
        id: 'high-noshow',
        type: 'warning',
        message: `Taxa de no-show acima do ideal: ${noShowRate}%`
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          newUsersThisMonth,
          userGrowth,
          totalPatients,
          newPatientsThisPeriod,
          patientGrowth,
          totalConsultationsMonth: consultationsThisPeriod,
          consultationsToday,
          avgConsultationsPerDay,
          consultationGrowth,
          cancellationRate,
          noShowRate,
          systemHealth
        },
        topProfessionals: topProfessionals.map((p: { doctorId: string; _count: { id: number } }) => ({
          id: p.doctorId,
          name: professionalMap.get(p.doctorId)?.name ?? null,
          role: professionalMap.get(p.doctorId)?.speciality ?? professionalMap.get(p.doctorId)?.role ?? null,
          consultations: p._count.id
        })),
        alerts,
        period,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Erro no dashboard admin:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dashboard' },
      { status: 500 }
    )
  }
}
