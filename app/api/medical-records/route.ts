import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { MedicalRecordsService } from '@/lib/medical-records-service-mock'

// GET - Buscar prontuários médicos
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'ALL'

    const filters = {
      search: search || undefined,
      type: type !== 'ALL' ? type : undefined
    }

    const result = await MedicalRecordsService.getMedicalRecords(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar novo prontuário médico
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      title,
      description,
      diagnosis,
      treatment,
      notes,
      recordType,
      priority,
      patientId
    } = body

    // Validações básicas
    if (!title || !description || !patientId) {
      return NextResponse.json(
        { error: 'Título, descrição e paciente são obrigatórios' },
        { status: 400 }
      )
    }

    const record = await MedicalRecordsService.createMedicalRecord({
      title,
      description,
      diagnosis,
      treatment,
      notes,
      recordType: recordType || 'CONSULTATION',
      priority: priority || 'NORMAL',
      patientId,
      doctorId: user.id
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})