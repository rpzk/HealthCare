import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ReferralsService } from '../../../lib/referrals-service-mock'

// GET - Buscar encaminhamentos
export const GET = withAuth(async (request, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const specialty = searchParams.get('specialty') || ''

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
    const {
      patientId,
      specialty,
      description,
      priority = 'NORMAL',
      notes
    } = body

    // Validações básicas
    if (!patientId || !specialty || !description) {
      return NextResponse.json(
        { error: 'Paciente, especialidade e descrição são obrigatórios' },
        { status: 400 }
      )
    }

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
