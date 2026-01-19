import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { MedicalRecordsService } from '@/lib/medical-records-service'
import { medicalRecordsAuditService } from '@/lib/medical-records-audit-service'
import { fieldMaskingService } from '@/lib/medical-records-masking-service'
import { rateLimitingService } from '@/lib/medical-records-rate-limiting-service'
import { notificationService } from '@/lib/notification-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
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

// ============================================
// HELPER: RBAC Check
// ============================================
/**
 * Verificar se usuário tem acesso ao prontuário
 * - ADMIN: acesso total
 * - DOCTOR: seu próprio prontuário ou pacientes atribuídos
 * - PATIENT: apenas seus próprios prontuários
 */
async function checkRecordAccess(record: any, user: any): Promise<boolean> {
  if (user.role === 'ADMIN') return true

  if (user.role === 'PATIENT') {
    // Paciente só vê seus próprios prontuários
    const patient = await prisma.patient.findFirst({
      where: { userId: user.id },
      select: { id: true }
    })
    return patient?.id === record.patientId
  }

  if (user.role === 'DOCTOR') {
    // Médico vê prontuários que criou
    if (record.doctorId === user.id) return true
    
    // Ou prontuários de pacientes atribuídos
    const hasLink = await prisma.patientCareTeam.findFirst({
      where: {
        patientId: record.patientId,
        professionalId: user.id,
        status: 'ACTIVE'
      }
    })
    return !!hasLink
  }

  return false
}

/**
 * GET /api/medical-records/[id]
 * Buscar um prontuário específico por ID com RBAC
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
      return NextResponse.json(
        { error: 'Prontuário não encontrado' },
        { status: 404 }
      )
    }

    // ============================================
    // RBAC: Verificar se usuário pode acessar
    // ============================================
    const canAccess = await checkRecordAccess(record, user)
    if (!canAccess) {
      await medicalRecordsAuditService.logError(
        'READ_DENIED',
        id,
        user.id,
        user.role,
        'Acesso negado pelo RBAC'
      )
      return NextResponse.json(
        { error: 'Acesso negado: sem permissão para visualizar este prontuário' },
        { status: 403 }
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

    // 🔔 Send notification to patient about update
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: updatedRecord.patientId },
        select: { userId: true }
      })
      
      if (patient?.userId) {
        const changesList = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined).join(', ')
        await notificationService.createNotification({
          userId: patient.userId,
          type: 'MEDICAL_RECORD',
          title: 'Prontuário Atualizado',
          message: `Seu prontuário "${updatedRecord.title}" foi atualizado. Campos alterados: ${changesList}`,
          priority: updatedRecord.priority === 'CRITICAL' || updatedRecord.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
          metadata: {
            recordId: updatedRecord.id,
            changes: changesList,
            updatedBy: user.id
          }
        })
      }
    } catch (notifError) {
      logger.error({ error: notifError }, 'Failed to send notification for record update')
      // Don't fail the request if notification fails
    }

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

    // 🔔 Send notification to patient about deletion
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: existingRecord.patientId },
        select: { userId: true }
      })
      
      if (patient?.userId) {
        await notificationService.createNotification({
          userId: patient.userId,
          type: 'SYSTEM',
          title: 'Prontuário Removido',
          message: `O prontuário "${existingRecord.title}" foi removido por um administrador.`,
          priority: 'HIGH',
          metadata: {
            recordId: id,
            recordTitle: existingRecord.title,
            deletedBy: user.id,
            deletedAt: new Date().toISOString()
          }
        })
      }
    } catch (notifError) {
      logger.error({ error: notifError }, 'Failed to send notification for record deletion')
      // Don't fail the request if notification fails
    }

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
