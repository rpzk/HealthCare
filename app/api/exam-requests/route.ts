import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ExamRequestsService } from '@/lib/exam-requests-service'

// GET - Buscar solicitações de exames
export const GET = withAuth(async (request, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const filters = {
      search: search || undefined,
      status: status || undefined,
      type: type || undefined
    }

    const result = await ExamRequestsService.getExamRequests(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar solicitações de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova solicitação de exame
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      patientId,
      examType,
      description,
      priority = 'NORMAL',
      notes,
      scheduledDate
    } = body

    // Validações básicas
    if (!patientId || !examType || !description) {
      return NextResponse.json(
        { error: 'Paciente, tipo de exame e descrição são obrigatórios' },
        { status: 400 }
      )
    }

    const examRequest = await ExamRequestsService.createExamRequest({
      patientId,
      doctorId: user.id,
      examType,
      description,
      priority,
      notes,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
    })

    return NextResponse.json(examRequest, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar solicitação de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})