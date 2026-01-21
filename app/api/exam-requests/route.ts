import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ExamRequestsService } from '@/lib/exam-requests-service'
import { examRequestQuerySchema, createExamRequestSchema, safeParseQueryParams } from '@/lib/validation-schemas-api'
import { logger } from '@/lib/logger'

// GET - Buscar solicitações de exames
export const GET = withAuth(async (request, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryResult = safeParseQueryParams(searchParams, examRequestQuerySchema)
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { page, limit, search, status, type } = queryResult.data

    const filters = {
      search: search || undefined,
      status: status || undefined,
      type: type || undefined
    }

    const result = await ExamRequestsService.getExamRequests(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Erro ao buscar solicitações de exame:', error)
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
    
    // Validate request body
    const parseResult = createExamRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { patientId, examType, description, priority, notes, scheduledDate } = parseResult.data

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
    logger.error('Erro ao criar solicitação de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})