import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { MedicalRecordsService } from '@/lib/medical-records-service'
import { medicalRecordsAuditService } from '@/lib/medical-records-audit-service'
import { fieldMaskingService } from '@/lib/medical-records-masking-service'
import { rateLimitingService } from '@/lib/medical-records-rate-limiting-service'
import { z } from 'zod'

// Schema de validação para prontuário médico
const medicalRecordSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  recordType: z.enum(['CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER']).default('CONSULTATION'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  patientId: z.string().uuid('ID de paciente inválido')
})

// GET - Buscar prontuários médicos
export const GET = withAuth(async (request: NextRequest, { user: _user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'ALL'

    // Validar paginação
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Parâmetros de paginação inválidos' },
        { status: 400 }
      )
    }

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
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check rate limit for CREATE operations
    const rateLimitCheck = rateLimitingService.checkRateLimit(user.id, 'CREATE')
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Taxa de requisições excedida. Tente novamente mais tarde.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter || 60)
          }
        }
      )
    }

    const body = await request.json()

    // Validar com Zod
    const validationResult = medicalRecordSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ')
      
      // Log validation error
      await medicalRecordsAuditService.logError(
        'CREATE',
        'new',
        user.id,
        user.role || 'UNKNOWN',
        `Validation error: ${errors}`
      )

      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const record = await MedicalRecordsService.createMedicalRecord({
      title: data.title,
      description: data.description,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes,
      recordType: data.recordType,
      priority: data.priority,
      patientId: data.patientId,
      doctorId: user.id
    })

    // Log successful creation
    await medicalRecordsAuditService.logCreate(
      record.id,
      record,
      user.id,
      user.role || 'DOCTOR'
    )

    // Apply masking before returning
    const maskedRecord = fieldMaskingService.maskRecord(record, user.role || 'DOCTOR')

    return NextResponse.json(maskedRecord, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prontuário:', error)
    
    // Log error
    await medicalRecordsAuditService.logError(
      'CREATE',
      'new',
      user.id,
      user.role || 'UNKNOWN',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})