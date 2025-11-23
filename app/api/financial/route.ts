import { NextResponse } from 'next/server'
import { FinancialService } from '@/lib/financial-service'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().setDate(1)) // First day of month
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date()

  try {
    const [balance, transactions] = await Promise.all([
      FinancialService.getBalance(startDate, endDate),
      FinancialService.getTransactions({ startDate, endDate })
    ])

    return NextResponse.json({ balance, transactions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 })
  }
})

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const transaction = await FinancialService.createTransaction({
      ...body,
      dueDate: new Date(body.dueDate)
    })
    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
})
