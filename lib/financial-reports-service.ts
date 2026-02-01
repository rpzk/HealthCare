/**
 * Financial Reports Service
 * 
 * Relatórios financeiros avançados:
 * - DRE (Demonstração do Resultado do Exercício)
 * - Fluxo de Caixa
 * - Contas a Receber / Pagar
 * - Análise por convênio/particular
 * - Rentabilidade por profissional
 * - Projeções e tendências
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Type for Prisma Decimal (compatible with both import and runtime)
type PrismaDecimal = { toNumber(): number }

// ============ TYPES ============

export interface DREReport {
  period: { start: Date; end: Date }
  revenue: {
    consultations: number
    procedures: number
    other: number
    total: number
  }
  deductions: {
    taxes: number
    discounts: number
    total: number
  }
  netRevenue: number
  operationalCosts: {
    supplies: number
    rent: number
    utilities: number
    payroll: number
    marketing: number
    maintenance: number
    other: number
    total: number
  }
  grossProfit: number
  grossMargin: number // percentual
  administrativeExpenses: {
    accounting: number
    legal: number
    software: number
    other: number
    total: number
  }
  operationalResult: number
  financialResult: {
    income: number
    expenses: number
    net: number
  }
  netResult: number
  netMargin: number // percentual
}

export interface CashFlowReport {
  period: { start: Date; end: Date }
  initialBalance: number
  inflows: {
    receivedPayments: number
    insurancePayments: number
    other: number
    total: number
  }
  outflows: {
    suppliers: number
    payroll: number
    rent: number
    taxes: number
    other: number
    total: number
  }
  netFlow: number
  finalBalance: number
  projectedNextMonth: number
}

export interface AccountsReceivable {
  total: number
  current: number // a vencer
  overdue: number // vencido
  byAge: {
    current: number
    days1to30: number
    days31to60: number
    days61to90: number
    over90: number
  }
  byInsurance: Array<{
    name: string
    amount: number
    percentage: number
  }>
  topDebtors: Array<{
    patientId: string
    patientName: string
    amount: number
    oldestDue: Date
  }>
}

export interface ProfessionalProfitability {
  professionalId: string
  name: string
  specialty: string
  consultations: number
  revenue: number
  averageTicket: number
  occupancyRate: number
  cancellationRate: number
  profitMargin: number
}

export interface FinancialSummary {
  period: { start: Date; end: Date }
  revenue: number
  expenses: number
  profit: number
  profitMargin: number
  comparison: {
    previousPeriodRevenue: number
    revenueGrowth: number
    previousPeriodExpenses: number
    expenseGrowth: number
  }
  topCategories: Array<{
    category: string
    type: 'income' | 'expense'
    amount: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
}

// Helper to convert Decimal to number
function toNumber(value: PrismaDecimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  return value.toNumber()
}

// ============ SERVICE CLASS ============

class FinancialReportsServiceClass {

  /**
   * Gera DRE do período
   */
  async generateDRE(startDate: Date, endDate: Date): Promise<DREReport> {
    logger.info(`[FinancialReports] Gerando DRE de ${format(startDate, 'MMM/yyyy', { locale: ptBR })} a ${format(endDate, 'MMM/yyyy', { locale: ptBR })}`)

    // Buscar transações do período (PAID)
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        paidDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      },
      include: {
        consultation: true
      }
    })

    // Separar receitas e despesas
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME')
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')

    // Calcular receitas por tipo
    const consultationRevenue = incomeTransactions
      .filter(t => t.category === 'CONSULTATION' || t.consultation?.type === 'INITIAL' || t.consultation?.type === 'FOLLOW_UP')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)
    
    const procedureRevenue = incomeTransactions
      .filter(t => t.category === 'PROCEDURE')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)
    
    const otherRevenue = incomeTransactions
      .filter(t => !['CONSULTATION', 'PROCEDURE'].includes(t.category))
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const totalRevenue = consultationRevenue + procedureRevenue + otherRevenue

    // Deduções (simplificado)
    const taxRate = 0.15 // 15% de impostos sobre serviços
    const taxes = totalRevenue * taxRate
    const discounts = 0 // Implementar se houver campo de desconto
    const totalDeductions = taxes + discounts

    const netRevenue = totalRevenue - totalDeductions

    // Custos operacionais
    const operationalCosts = {
      supplies: this.sumByCategory(expenseTransactions, 'SUPPLIES'),
      rent: this.sumByCategory(expenseTransactions, 'RENT'),
      utilities: this.sumByCategory(expenseTransactions, 'UTILITIES'),
      payroll: this.sumByCategory(expenseTransactions, 'PAYROLL'),
      marketing: this.sumByCategory(expenseTransactions, 'MARKETING'),
      maintenance: this.sumByCategory(expenseTransactions, 'MAINTENANCE'),
      other: this.sumOtherCategories(expenseTransactions, ['SUPPLIES', 'RENT', 'UTILITIES', 'PAYROLL', 'MARKETING', 'MAINTENANCE', 'ACCOUNTING', 'LEGAL', 'SOFTWARE']),
      total: 0
    }
    operationalCosts.total = operationalCosts.supplies + operationalCosts.rent + 
      operationalCosts.utilities + operationalCosts.payroll + 
      operationalCosts.marketing + operationalCosts.maintenance + operationalCosts.other

    const grossProfit = netRevenue - operationalCosts.total
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0

    // Despesas administrativas
    const administrativeExpenses = {
      accounting: this.sumByCategory(expenseTransactions, 'ACCOUNTING'),
      legal: this.sumByCategory(expenseTransactions, 'LEGAL'),
      software: this.sumByCategory(expenseTransactions, 'SOFTWARE'),
      other: this.sumByCategory(expenseTransactions, 'ADMIN_OTHER'),
      total: 0
    }
    administrativeExpenses.total = administrativeExpenses.accounting + 
      administrativeExpenses.legal + administrativeExpenses.software + administrativeExpenses.other

    const operationalResult = grossProfit - administrativeExpenses.total

    // Resultado financeiro
    const financialResult = {
      income: this.sumByCategory(incomeTransactions, 'FINANCIAL'),
      expenses: this.sumByCategory(expenseTransactions, 'FINANCIAL'),
      net: 0
    }
    financialResult.net = financialResult.income - financialResult.expenses

    const netResult = operationalResult + financialResult.net
    const netMargin = netRevenue > 0 ? (netResult / netRevenue) * 100 : 0

    return {
      period: { start: startDate, end: endDate },
      revenue: {
        consultations: consultationRevenue,
        procedures: procedureRevenue,
        other: otherRevenue,
        total: totalRevenue
      },
      deductions: {
        taxes,
        discounts,
        total: totalDeductions
      },
      netRevenue,
      operationalCosts,
      grossProfit,
      grossMargin,
      administrativeExpenses,
      operationalResult,
      financialResult,
      netResult,
      netMargin
    }
  }

  /**
   * Gera fluxo de caixa
   */
  async generateCashFlow(startDate: Date, endDate: Date): Promise<CashFlowReport> {
    logger.info(`[FinancialReports] Gerando Fluxo de Caixa`)

    // Saldo inicial (soma de transações até startDate)
    const previousTransactions = await prisma.financialTransaction.findMany({
      where: {
        paidDate: { lt: startDate },
        status: 'PAID'
      }
    })

    const initialBalance = previousTransactions.reduce((sum, t) => {
      const amount = toNumber(t.amount)
      return sum + (t.type === 'INCOME' ? amount : -amount)
    }, 0)

    // Transações do período
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        paidDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      },
      include: {
        insurance: true
      }
    })

    // Separar receitas
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME')
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')

    // Pagamentos recebidos
    const receivedPayments = incomeTransactions
      .filter(t => !t.insuranceId)
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const insurancePayments = incomeTransactions
      .filter(t => t.insuranceId)
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const otherInflows = 0 // Outros tipos de entrada se necessário

    const totalInflows = receivedPayments + insurancePayments + otherInflows

    // Saídas por categoria
    const outflows = {
      suppliers: this.sumByCategory(expenseTransactions, 'SUPPLIES'),
      payroll: this.sumByCategory(expenseTransactions, 'PAYROLL'),
      rent: this.sumByCategory(expenseTransactions, 'RENT'),
      taxes: this.sumByCategory(expenseTransactions, 'TAXES'),
      other: this.sumOtherCategories(expenseTransactions, ['SUPPLIES', 'PAYROLL', 'RENT', 'TAXES']),
      total: 0
    }
    outflows.total = outflows.suppliers + outflows.payroll + outflows.rent + outflows.taxes + outflows.other

    const netFlow = totalInflows - outflows.total
    const finalBalance = initialBalance + netFlow

    // Projeção próximo mês (média dos últimos 3 meses)
    const projectedNextMonth = netFlow // Simplificado

    return {
      period: { start: startDate, end: endDate },
      initialBalance,
      inflows: {
        receivedPayments,
        insurancePayments,
        other: otherInflows,
        total: totalInflows
      },
      outflows,
      netFlow,
      finalBalance,
      projectedNextMonth
    }
  }

  /**
   * Gera relatório de contas a receber
   */
  async generateAccountsReceivable(): Promise<AccountsReceivable> {
    const today = new Date()

    // Buscar transações pendentes (receitas ainda não pagas)
    const pendingTransactions = await prisma.financialTransaction.findMany({
      where: {
        type: 'INCOME',
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      include: {
        patient: true,
        insurance: true
      }
    })

    const total = pendingTransactions.reduce((sum, t) => sum + toNumber(t.amount), 0)
    const current = pendingTransactions
      .filter(t => t.dueDate >= today)
      .reduce((sum, t) => sum + toNumber(t.amount), 0)
    const overdue = total - current

    // Por idade
    const calculateAge = (dueDate: Date) => {
      const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return days < 0 ? 0 : days
    }

    const byAge = {
      current: pendingTransactions.filter(t => calculateAge(t.dueDate) <= 0).reduce((s, t) => s + toNumber(t.amount), 0),
      days1to30: pendingTransactions.filter(t => {
        const age = calculateAge(t.dueDate)
        return age > 0 && age <= 30
      }).reduce((s, t) => s + toNumber(t.amount), 0),
      days31to60: pendingTransactions.filter(t => {
        const age = calculateAge(t.dueDate)
        return age > 30 && age <= 60
      }).reduce((s, t) => s + toNumber(t.amount), 0),
      days61to90: pendingTransactions.filter(t => {
        const age = calculateAge(t.dueDate)
        return age > 60 && age <= 90
      }).reduce((s, t) => s + toNumber(t.amount), 0),
      over90: pendingTransactions.filter(t => calculateAge(t.dueDate) > 90).reduce((s, t) => s + toNumber(t.amount), 0)
    }

    // Por convênio
    const insuranceMap = new Map<string, number>()
    pendingTransactions.forEach(t => {
      const name = t.insurance?.name || 'Particular'
      insuranceMap.set(name, (insuranceMap.get(name) || 0) + toNumber(t.amount))
    })
    
    const byInsurance = Array.from(insuranceMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Top devedores
    const debtorMap = new Map<string, { name: string; amount: number; oldestDue: Date }>()
    pendingTransactions.forEach(t => {
      if (!t.patientId) return
      const existing = debtorMap.get(t.patientId)
      const amount = toNumber(t.amount)
      if (existing) {
        existing.amount += amount
        if (t.dueDate < existing.oldestDue) {
          existing.oldestDue = t.dueDate
        }
      } else {
        debtorMap.set(t.patientId, {
          name: t.patient?.name || 'Desconhecido',
          amount,
          oldestDue: t.dueDate
        })
      }
    })

    const topDebtors = Array.from(debtorMap.entries())
      .map(([patientId, data]) => ({
        patientId,
        patientName: data.name,
        amount: data.amount,
        oldestDue: data.oldestDue
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    return {
      total,
      current,
      overdue,
      byAge,
      byInsurance,
      topDebtors
    }
  }

  /**
   * Gera rentabilidade por profissional
   */
  async generateProfessionalProfitability(startDate: Date, endDate: Date): Promise<ProfessionalProfitability[]> {
    logger.info(`[FinancialReports] Gerando rentabilidade por profissional`)

    // Buscar consultas do período com transações
    const consultations = await prisma.consultation.findMany({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate
        },
        status: { in: ['COMPLETED', 'CANCELLED'] }
      },
      include: {
        doctor: true,
        financialTransaction: true
      }
    })

    // Agrupar por profissional
    const professionalMap = new Map<string, {
      name: string
      specialty: string
      total: number
      completed: number
      cancelled: number
      revenue: number
    }>()

    consultations.forEach(c => {
      if (!c.doctorId) return
      
      const existing = professionalMap.get(c.doctorId)
      const revenue = c.financialTransaction?.status === 'PAID' ? toNumber(c.financialTransaction.amount) : 0
      
      if (existing) {
        existing.total++
        if (c.status === 'COMPLETED') {
          existing.completed++
          existing.revenue += revenue
        } else if (c.status === 'CANCELLED') {
          existing.cancelled++
        }
      } else {
        professionalMap.set(c.doctorId, {
          name: c.doctor?.name || 'Desconhecido',
          specialty: 'Não informada',
          total: 1,
          completed: c.status === 'COMPLETED' ? 1 : 0,
          cancelled: c.status === 'CANCELLED' ? 1 : 0,
          revenue: c.status === 'COMPLETED' ? revenue : 0
        })
      }
    })

    // Buscar disponibilidade para calcular ocupação (simplificado)
    const schedules = await prisma.doctorSchedule.findMany()
    const scheduleMap = new Map<string, number>()
    schedules.forEach(s => {
      const [startH] = s.startTime.split(':').map(Number)
      const [endH] = s.endTime.split(':').map(Number)
      const hoursPerDay = endH - startH
      const slotsPerDay = Math.floor((hoursPerDay * 60) / s.slotDuration)
      scheduleMap.set(s.doctorId, (scheduleMap.get(s.doctorId) || 0) + slotsPerDay)
    })

    // Calcular semanas no período
    const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

    return Array.from(professionalMap.entries())
      .map(([professionalId, data]) => {
        const totalSlots = (scheduleMap.get(professionalId) || 20) * weeks
        const averageTicket = data.completed > 0 ? data.revenue / data.completed : 0
        const occupancyRate = totalSlots > 0 ? (data.total / totalSlots) * 100 : 0
        const cancellationRate = data.total > 0 ? (data.cancelled / data.total) * 100 : 0
        const profitMargin = data.revenue > 0 ? 30 : 0 // Margem fixa simplificada

        return {
          professionalId,
          name: data.name,
          specialty: data.specialty,
          consultations: data.completed,
          revenue: data.revenue,
          averageTicket,
          occupancyRate: Math.min(occupancyRate, 100),
          cancellationRate,
          profitMargin
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }

  /**
   * Gera resumo financeiro com comparativos
   */
  async generateSummary(startDate: Date, endDate: Date): Promise<FinancialSummary> {
    logger.info(`[FinancialReports] Gerando resumo financeiro`)

    // Período atual
    const currentTransactions = await prisma.financialTransaction.findMany({
      where: {
        paidDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      }
    })

    const revenue = currentTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const expenses = currentTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const profit = revenue - expenses
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

    // Período anterior (mesmo tamanho)
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousStart = new Date(startDate.getTime() - periodLength)
    const previousEnd = new Date(endDate.getTime() - periodLength)

    const previousTransactions = await prisma.financialTransaction.findMany({
      where: {
        paidDate: {
          gte: previousStart,
          lte: previousEnd
        },
        status: 'PAID'
      }
    })

    const previousRevenue = previousTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const previousExpenses = previousTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + toNumber(t.amount), 0)

    const revenueGrowth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0
    const expenseGrowth = previousExpenses > 0 ? ((expenses - previousExpenses) / previousExpenses) * 100 : 0

    // Top categorias
    const categoryMap = new Map<string, { type: 'income' | 'expense'; amount: number }>()
    currentTransactions.forEach(t => {
      const key = `${t.type}-${t.category}`
      const existing = categoryMap.get(key)
      const amount = toNumber(t.amount)
      if (existing) {
        existing.amount += amount
      } else {
        categoryMap.set(key, {
          type: t.type === 'INCOME' ? 'income' : 'expense',
          amount
        })
      }
    })

    const topCategories = Array.from(categoryMap.entries())
      .map(([key, data]) => ({
        category: key.split('-')[1],
        type: data.type,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Tendência mensal (últimos 6 meses)
    const sixMonthsAgo = subMonths(endDate, 6)
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: endDate })

    const monthlyTrendPromises = months.map(async (monthStart) => {
      const monthEnd = endOfMonth(monthStart)
      const monthTransactions = await prisma.financialTransaction.findMany({
        where: {
          paidDate: {
            gte: monthStart,
            lte: monthEnd
          },
          status: 'PAID'
        }
      })

      const monthRevenue = monthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + toNumber(t.amount), 0)

      const monthExpenses = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + toNumber(t.amount), 0)

      return {
        month: format(monthStart, 'MMM/yy', { locale: ptBR }),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      }
    })

    const monthlyTrend = await Promise.all(monthlyTrendPromises)

    return {
      period: { start: startDate, end: endDate },
      revenue,
      expenses,
      profit,
      profitMargin,
      comparison: {
        previousPeriodRevenue: previousRevenue,
        revenueGrowth,
        previousPeriodExpenses: previousExpenses,
        expenseGrowth
      },
      topCategories,
      monthlyTrend
    }
  }

  // ============ HELPER METHODS ============

  private sumByCategory(transactions: Array<{ category: string; amount: PrismaDecimal }>, category: string): number {
    return transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + toNumber(t.amount), 0)
  }

  private sumOtherCategories(transactions: Array<{ category: string; amount: PrismaDecimal }>, excludeCategories: string[]): number {
    return transactions
      .filter(t => !excludeCategories.includes(t.category))
      .reduce((sum, t) => sum + toNumber(t.amount), 0)
  }

  // ============ CONVENIENCE METHODS ============

  /**
   * Gera DRE do mês atual
   */
  async generateCurrentMonthDRE(): Promise<DREReport> {
    const now = new Date()
    return this.generateDRE(startOfMonth(now), endOfMonth(now))
  }

  /**
   * Gera DRE do ano atual
   */
  async generateCurrentYearDRE(): Promise<DREReport> {
    const now = new Date()
    return this.generateDRE(startOfYear(now), endOfYear(now))
  }

  /**
   * Gera fluxo de caixa do mês atual
   */
  async generateCurrentMonthCashFlow(): Promise<CashFlowReport> {
    const now = new Date()
    return this.generateCashFlow(startOfMonth(now), endOfMonth(now))
  }

  /**
   * Gera resumo do mês atual
   */
  async generateCurrentMonthSummary(): Promise<FinancialSummary> {
    const now = new Date()
    return this.generateSummary(startOfMonth(now), endOfMonth(now))
  }

  /**
   * Exporta relatório para PDF (placeholder)
   */
  async exportToPDF(_reportType: string, _startDate: Date, _endDate: Date): Promise<Buffer> {
    // TODO: Implementar geração de PDF com jsPDF ou similar
    throw new Error('Exportação PDF ainda não implementada')
  }

  /**
   * Exporta relatório para Excel (placeholder)
   */
  async exportToExcel(_reportType: string, _startDate: Date, _endDate: Date): Promise<Buffer> {
    // TODO: Implementar geração de Excel com exceljs
    throw new Error('Exportação Excel ainda não implementada')
  }
}

// Singleton export
export const FinancialReportsService = new FinancialReportsServiceClass()

// Default export
export default FinancialReportsService
