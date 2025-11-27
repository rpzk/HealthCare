import { prisma } from '@/lib/prisma'
import { TransactionType, TransactionStatus } from '@prisma/client'

export interface TransactionCreateData {
  type: TransactionType
  amount: number
  description: string
  category: string
  dueDate: Date
  patientId?: string
  consultationId?: string
  paymentMethod?: string
}

export class FinancialService {
  static async createTransaction(data: TransactionCreateData) {
    return prisma.financialTransaction.create({
      data: {
        ...data,
        status: 'PENDING'
      }
    })
  }

  static async markAsPaid(id: string) {
    return prisma.financialTransaction.update({
      where: { id },
      data: {
        status: 'PAID',
        paidDate: new Date()
      }
    })
  }

  static async getBalance(startDate: Date, endDate: Date) {
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        dueDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      }
    })

    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + Number(t.amount), 0)

    const expense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + Number(t.amount), 0)

    return {
      income,
      expense,
      balance: income - expense
    }
  }

  static async getTransactions(filters: {
    status?: TransactionStatus
    type?: TransactionType
    startDate?: Date
    endDate?: Date
  }) {
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type
    if (filters.startDate || filters.endDate) {
      where.dueDate = {}
      if (filters.startDate) where.dueDate.gte = filters.startDate
      if (filters.endDate) where.dueDate.lte = filters.endDate
    }

    return prisma.financialTransaction.findMany({
      where,
      orderBy: { dueDate: 'desc' },
      include: {
        patient: {
          select: { name: true }
        }
      }
    })
  }
}
