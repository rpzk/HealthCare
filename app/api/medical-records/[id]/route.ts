import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { MedicalRecordsService } from '@/lib/medical-records-service'
import { medicalRecordsAuditService } from '@/lib/medical-records-audit-service'
import { fieldMaskingService } from '@/lib/medical-records-masking-service'
import { rateLimitingService } from '@/lib/medical-records-rate-limiting-service'
import { z } from 'zod'

// Schema de validação para atualizar prontuário
const updateMedicalRecordSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').optional(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  recordType: z.enum(['CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional()
})

/**
 * GET /api/medical-records/[id]
 * Buscar um prontuário específico por ID
 */
export const GET = withAuth(async (request: NextRequest, { user: _user, params }) => {
  try {
    const { id } = params
    const user = _user as any

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de prontuário inválido' },
        { status: 400 }
      )
    }

    // Buscar prontuário pelo ID
    const record = await MedicalRecordsService.getMedicalRecordById(id)

    if (!record) {
      // Log read attempt on non-existent record
      if (process.env.DEBUG_AUDIT === 'true') {
        console.log(`[AUDIT] READ attempt on non-existent record: ${id} by user ${user.id}`)
      }
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Log read operation
    await medicalRecordsAuditService.logRead(id, user.id, user.role, {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Apply field masking based on user role
    const maskedRecord = fieldMaskingService.maskRecord(record, user.role)

    return NextResponse.json(maskedRecord)
  } catch (error) {
    console.error('Erro ao buscar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

/**
 * PUT /api/medical-records/[id]
 * Atualizar um prontuário existente
 */
export const PUT = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de prontuário inválido' },
        { status: 400 }
      )
    }

    // Check rate limit for UPDATE operations
    const rateLimitCheck = rateLimitingService.checkRateLimit(user.id, 'UPDATE')
    if (!rateLimitCheck.allowed) {
      if (process.env.DEBUG_AUDIT === 'true') {
        console.log(`[RATE_LIMIT] UPDATE exceeded for user ${user.id}`)
      }
      return NextResponse.json(
        { error: 'Taxa de requisições excedida. Tente novamente depois.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
      )
    }

    const body = await request.json()

    // Validar com Zod
    const validationResult = updateMedicalRecordSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ')
      
      // Log validation error
      await medicalRecordsAuditService.logError(
        'UPDATE',
        id,
        user.id,
        user.role,
        `Validation error: ${errors}`
      )
      
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    // Verificar se prontuário existe e pertence ao médico
    const existingRecord = await MedicalRecordsService.getMedicalRecordById(id)
    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão: apenas o médico que criou ou admin podem editar
    if (existingRecord.doctorId !== user.id && user.role !== 'ADMIN') {
      // Log unauthorized update attempt
      await medicalRecordsAuditService.logError(
        'UPDATE',
        id,
        user.id,
        user.role,
        'Permission denied: user is not the creator or admin'
      )
      return NextResponse.json(
        { error: 'Permissão negada: você não pode editar este prontuário' },
        { status: 403 }
      )
    }

    const data = validationResult.data

    const updatedRecord = await MedicalRecordsService.updateMedicalRecord(id, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
      ...(data.treatment !== undefined && { treatment: data.treatment }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.recordType !== undefined && { recordType: data.recordType }),
      ...(data.priority !== undefined && { priority: data.priority })
    })

    // Log update operation with before/after snapshots
    await medicalRecordsAuditService.logUpdate(id, existingRecord, updatedRecord, user.id, user.role, {
      changes: Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined)
    })

    // Apply field masking based on user role
    const maskedRecord = fieldMaskingService.maskRecord(updatedRecord, user.role)

    return NextResponse.json(maskedRecord)
  } catch (error) {
    console.error('Erro ao atualizar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/medical-records/[id]
 * Deletar um prontuário
 */
export const DELETE = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de prontuário inválido' },
        { status: 400 }
      )
    }

    // Check rate limit for DELETE operations
    const rateLimitCheck = rateLimitingService.checkRateLimit(user.id, 'DELETE')
    if (!rateLimitCheck.allowed) {
      if (process.env.DEBUG_AUDIT === 'true') {
        console.log(`[RATE_LIMIT] DELETE exceeded for user ${user.id}`)
      }
      return NextResponse.json(
        { error: 'Taxa de requisições excedida. Tente novamente depois.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
      )
    }

    // Verificar se prontuário existe e pertence ao médico
    const existingRecord = await MedicalRecordsService.getMedicalRecordById(id)
    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão: apenas admin podem deletar
    if (user.role !== 'ADMIN') {
      // Log unauthorized delete attempt
      await medicalRecordsAuditService.logError(
        'DELETE',
        id,
        user.id,
        user.role,
        'Permission denied: only administrators can delete records'
      )
      return NextResponse.json(
        { error: 'Permissão negada: apenas administradores podem deletar prontuários' },
        { status: 403 }
      )
    }

    await MedicalRecordsService.deleteMedicalRecord(id)

    // Log delete operation with full record snapshot
    await medicalRecordsAuditService.logDelete(id, existingRecord, user.id, user.role, {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      reason: 'Admin deletion'
    })

    return NextResponse.json(
      { message: 'Prontuário deletado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
