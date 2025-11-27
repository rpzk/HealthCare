import { NextResponse } from 'next/server'
import { FinancialService } from '@/lib/financial-service'
import { withAuth } from '@/lib/with-auth'
import { financialQuerySchema, createTransactionSchema, safeParseQueryParams } from '@/lib/validation-schemas-api'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  
  // Validate query parameters
  const queryResult = safeParseQueryParams(searchParams, financialQuerySchema)
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  
  const { startDate, endDate } = queryResult.data

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
    
    // Validate request body
    const parseResult = createTransactionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const validatedData = parseResult.data
    const transaction = await FinancialService.createTransaction({
      ...validatedData,
      dueDate: new Date(validatedData.dueDate)
    })
    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
})
