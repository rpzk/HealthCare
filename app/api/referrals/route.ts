import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ReferralsService } from '@/lib/referrals-service'
import { referralQuerySchema, createReferralSchema, safeParseQueryParams } from '@/lib/validation-schemas-api'

// GET - Buscar encaminhamentos
export const GET = withAuth(async (request, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryResult = safeParseQueryParams(searchParams, referralQuerySchema)
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { page, limit, search, status, specialty } = queryResult.data

    const filters = {
      search: search || undefined,
      status: status || undefined,
      specialty: specialty || undefined
    }

    const result = await ReferralsService.getReferrals(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar encaminhamentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar novo encaminhamento
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    
    // Validate request body
    const parseResult = createReferralSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { patientId, specialty, description, priority, notes } = parseResult.data

    const referral = await ReferralsService.createReferral({
      patientId,
      doctorId: user.id,
      specialty,
      description,
      priority,
      notes
    })

    return NextResponse.json(referral, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar encaminhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
