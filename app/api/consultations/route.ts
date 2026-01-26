import { NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'
import { rateLimiters } from '@/lib/rate-limiter'
import { withConsultationAuth } from '@/lib/advanced-auth'
import { ConsultationType } from '@prisma/client'
import { consultationQuerySchema, createConsultationSchema, safeParseQueryParams } from '@/lib/validation-schemas-api'
import { logger } from '@/lib/logger'

type RateLimitOk = {
  allowed: true
  headers?: Record<string, string>
}

// GET - Listar consultas (protegido por autenticação)
export const GET = withConsultationAuth(async (request, { user }) => {
  const rateLimitResult = rateLimiters.consultations(request, user.id)
  if (rateLimitResult instanceof NextResponse) return rateLimitResult
  const rateLimitOk = rateLimitResult as RateLimitOk
  try {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryResult = safeParseQueryParams(searchParams, consultationQuerySchema)
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { page, limit, patientId, doctorId, status, type, search, dateFrom, dateTo } = queryResult.data

    const filters = {
      patientId,
      doctorId,
      status,
      type: type as ConsultationType,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    }

    const result = await ConsultationService.getConsultations(filters, page, limit)

    const resp = NextResponse.json(result)
    if (rateLimitOk.headers) {
      Object.entries(rateLimitOk.headers).forEach(([k, v]) => resp.headers.set(k, v))
    }
    return resp
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar consultas')
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova consulta (protegido por autenticação)
export const POST = withConsultationAuth(async (request, { user }) => {
  const rateLimitResult = rateLimiters.consultations(request, user.id)
  if (rateLimitResult instanceof NextResponse) return rateLimitResult
  const rateLimitOk = rateLimitResult as RateLimitOk
  try {
    const body = await request.json()

    // Validate request body with Zod
    const parseResult = createConsultationSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const validatedData = parseResult.data
    const scheduledDate = new Date(validatedData.scheduledDate)

    const consultationData = {
      patientId: validatedData.patientId,
      doctorId: validatedData.doctorId,
      scheduledDate,
      type: validatedData.type,
      chiefComplaint: validatedData.description || undefined,  // Mapear description para chiefComplaint
      notes: validatedData.notes || undefined,
      duration: validatedData.duration || 60,
      status: validatedData.status || 'SCHEDULED'
    }

    const consultation = await ConsultationService.createConsultation(consultationData)

    const resp = NextResponse.json({
      message: 'Consulta criada com sucesso',
      consultation
    }, { status: 201 })
    if (rateLimitOk.headers) {
      Object.entries(rateLimitOk.headers).forEach(([k, v]) => resp.headers.set(k, v))
    }
    return resp

  } catch (error) {
    logger.error({ err: error }, 'Erro ao criar consulta')

    const message = error instanceof Error ? error.message : ''
    
    if (message.includes('não encontrado') || message.includes('já existe uma consulta')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    const respErr = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
    if (rateLimitOk.headers) {
      Object.entries(rateLimitOk.headers).forEach(([k, v]) => respErr.headers.set(k, v))
    }
    return respErr
  }
})
