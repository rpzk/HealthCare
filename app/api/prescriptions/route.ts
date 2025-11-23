import { NextResponse } from 'next/server'
import { withAuth, validateRequestBody } from '@/lib/with-auth'
import { PrescriptionsServiceDb } from '@/lib/prescriptions-service'
import { validatePrescription } from '@/lib/validation-schemas'

// GET - Buscar prescrições médicas
export const GET = withAuth(async (request, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const filters = {
      search: search || undefined,
      status: status || undefined
    }

    const result = await PrescriptionsServiceDb.list(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar prescrições (outer catch):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova prescrição médica
export const POST = withAuth(async (request, { user }) => {
  try {
    const validation = await validateRequestBody(request, validatePrescription)
    if (!validation.success) return validation.response!

    const data = validation.data!
    let created
    try {
      created = await PrescriptionsServiceDb.create({
        patientId: data.patientId,
        doctorId: user.id,
        medications: data.medications as any,
        notes: (data as any).observations,
        status: 'ACTIVE',
      })
    } catch (innerErr: any) {
      console.error('PrescriptionsServiceDb.create failed', {
        message: innerErr?.message,
        code: innerErr?.code,
        meta: innerErr?.meta,
        stack: innerErr?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw innerErr
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prescrição (outer catch):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})