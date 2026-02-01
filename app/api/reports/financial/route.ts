/**
 * API: Financial Reports
 * 
 * Endpoints para relatórios financeiros avançados
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FinancialReportsService } from '@/lib/financial-reports-service'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parseISO } from 'date-fns'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT']

/**
 * GET /api/reports/financial
 * 
 * Query params:
 * - type: 'dre' | 'cashflow' | 'receivables' | 'profitability' | 'summary'
 * - period: 'month' | 'quarter' | 'year' | 'custom'
 * - start: ISO date (para custom)
 * - end: ISO date (para custom)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!ADMIN_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const period = searchParams.get('period') || 'month'
    
    // Calcular período
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === 'custom') {
      startDate = parseISO(searchParams.get('start') || now.toISOString())
      endDate = parseISO(searchParams.get('end') || now.toISOString())
    } else if (period === 'year') {
      startDate = startOfYear(now)
      endDate = endOfYear(now)
    } else if (period === 'quarter') {
      startDate = subMonths(now, 3)
      endDate = now
    } else {
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
    }

    logger.info(`[FinancialReports] Gerando ${type} para ${period}`)

    let report

    switch (type) {
      case 'dre':
        report = await FinancialReportsService.generateDRE(startDate, endDate)
        break
      
      case 'cashflow':
        report = await FinancialReportsService.generateCashFlow(startDate, endDate)
        break
      
      case 'receivables':
        report = await FinancialReportsService.generateAccountsReceivable()
        break
      
      case 'profitability':
        report = await FinancialReportsService.generateProfessionalProfitability(startDate, endDate)
        break
      
      case 'summary':
      default:
        report = await FinancialReportsService.generateSummary(startDate, endDate)
        break
    }

    return NextResponse.json({
      success: true,
      type,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      report,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    logger.error('[FinancialReports API] Erro:', error)
    return NextResponse.json({
      error: 'Erro ao gerar relatório',
      message: (error as Error).message
    }, { status: 500 })
  }
}
