import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service-mock'
import { rateLimiters } from '@/lib/rate-limiter'
import { withConsultationAuth } from '@/lib/advanced-auth-v2'
import { ConsultationType } from '@prisma/client'

// GET - Listar consultas (protegido por autenticação)
export const GET = withConsultationAuth(async (request: NextRequest, { user }) => {
  const limit = rateLimiters.consultations(request, user.id)
  if ((limit as any)?.status === 429) return limit as any
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const patientId = searchParams.get('patientId') || undefined
    const doctorId = searchParams.get('doctorId') || undefined
    const status = searchParams.get('status') as any
    const type = searchParams.get('type') as ConsultationType
    const search = searchParams.get('search') || undefined
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    const filters = {
      patientId,
      doctorId,
      status,
      type,
      search,
      dateFrom,
      dateTo
    }

    const result = await ConsultationService.getConsultations(filters, page, limit)

    const resp = NextResponse.json(result)
    if ((limit as any)?.headers) {
      Object.entries((limit as any).headers as Record<string,string>).forEach(([k,v]) => resp.headers.set(k, v))
    }
    return resp
  } catch (error) {
    console.error('Erro ao buscar consultas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova consulta (protegido por autenticação)
export const POST = withConsultationAuth(async (request: NextRequest, { user }) => {
  const limit = rateLimiters.consultations(request, user.id)
  if ((limit as any)?.status === 429) return limit as any
  try {
    const body = await request.json()

    // Validação básica
    const requiredFields = ['patientId', 'doctorId', 'scheduledDate', 'type']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Campo obrigatório: ${field}` },
          { status: 400 }
        )
      }
    }

    // Permitir criar consulta imediata (sem exigir data futura)
    const scheduledDate = new Date(body.scheduledDate)

    // Validar tipo de consulta
    const validTypes = ['ROUTINE', 'URGENT', 'EMERGENCY', 'FOLLOW_UP', 'PREVENTIVE']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Tipo de consulta inválido' },
        { status: 400 }
      )
    }

    const consultationData = {
      patientId: body.patientId,
      doctorId: body.doctorId,
      scheduledDate,
      type: body.type,
      description: body.description || '',
      notes: body.notes || '',
      duration: body.duration || 60,
      status: body.status || 'SCHEDULED'
    }

    const consultation = await ConsultationService.createConsultation(consultationData)

    const resp = NextResponse.json({
      message: 'Consulta criada com sucesso',
      consultation
    }, { status: 201 })
    if ((limit as any)?.headers) {
      Object.entries((limit as any).headers as Record<string,string>).forEach(([k,v]) => resp.headers.set(k, v))
    }
    return resp

  } catch (error: any) {
    console.error('Erro ao criar consulta:', error)
    
    if (error.message.includes('não encontrado') || 
        error.message.includes('já existe uma consulta')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const respErr = NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
    if ((limit as any)?.headers) {
      Object.entries((limit as any).headers as Record<string,string>).forEach(([k,v]) => respErr.headers.set(k, v))
    }
    return respErr
  }
})
