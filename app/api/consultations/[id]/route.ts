import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService, ConsultationUpdateData } from '@/lib/consultation-service-mock'
import { withAuth, withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { ConsultationType, ConsultationStatus } from '@prisma/client'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// Schema de validação para atualização de consulta
const updateConsultationSchema = z.object({
  scheduledDate: z.string().transform((val) => {
    if (!val) return undefined
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error("Data inválida")
    if (date <= new Date()) throw new Error("A data da consulta deve ser futura")
    return date
  }).optional(),
  status: z.nativeEnum(ConsultationStatus).optional(),
  type: z.nativeEnum(ConsultationType).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  duration: z.number().min(15, "Duração deve ser pelo menos 15 minutos").max(240, "Duração não pode exceder 240 minutos").optional()
})

// Schema de validação para ações PATCH
const patchConsultationSchema = z.object({
  action: z.enum(['start', 'complete', 'cancel', 'no-show'], {
    errorMap: () => ({ message: 'Ação deve ser "start", "complete", "cancel" ou "no-show"' })
  }),
  notes: z.string().optional(),
  reason: z.string().optional()
})

// GET - Buscar consulta por ID
export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  try {
    const consultation = await ConsultationService.getConsultationById(params.id)
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Consultation',
      { consultationId: params.id, patientName: consultation.patient.name }
    )
    
    return NextResponse.json({ consultation })
  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Consultation',
      error.message,
      { consultationId: params.id }
    )
    
    console.error('Erro ao buscar consulta:', error)
    
    if (error.message === 'Consulta não encontrada') {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// PUT - Atualizar consulta
export const PUT = withDoctorAuth(async (request: NextRequest, { params, user }) => {
  try {
    const data = await request.json()
    
    // Validação com Zod
    const validationResult = updateConsultationSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ')
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Validar se pelo menos um campo foi fornecido
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos um campo deve ser fornecido para atualização' },
        { status: 400 }
      )
    }

    const consultation = await ConsultationService.updateConsultation(params.id, validatedData)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      { 
        consultationId: params.id,
        updatedFields: Object.keys(validatedData),
        patientName: consultation.patient.name
      }
    )

    return NextResponse.json({
      message: 'Consulta atualizada com sucesso',
      consultation
    })

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      error.message,
      { consultationId: params.id }
    )
    
    console.error('Erro ao atualizar consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('já existe uma consulta')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// PATCH - Ações específicas na consulta
export const PATCH = withDoctorAuth(async (request: NextRequest, { params, user }) => {
  try {
    const body = await request.json()
    
    // Validação com Zod
    const validationResult = patchConsultationSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ')
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const { action, notes, reason } = validationResult.data

    let result

    switch (action) {
      case 'start':
        result = await ConsultationService.startConsultation(params.id)
        break

      case 'complete':
        if (!notes) {
          return NextResponse.json(
            { error: 'Notas são obrigatórias para finalizar a consulta' },
            { status: 400 }
          )
        }
        result = await ConsultationService.completeConsultation(params.id, notes)
        break

      case 'cancel':
        result = await ConsultationService.cancelConsultation(params.id, reason || 'Cancelada pelo médico')
        break

      case 'no-show':
        result = await ConsultationService.markAsNoShow(params.id)
        break
    }

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      { 
        consultationId: params.id,
        action: action
      }
    )

    return NextResponse.json({
      message: 'Consulta atualizada com sucesso',
      consultation: result
    })

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_UPDATE,
      'Consultation',
      error.message,
      { consultationId: params.id }
    )
    
    console.error('Erro ao executar ação na consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('podem ser')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// DELETE - Cancelar consulta (soft delete)
export const DELETE = withDoctorAuth(async (request: NextRequest, { params, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || 'Cancelada pelo sistema'

    const consultation = await ConsultationService.cancelConsultation(params.id, reason)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_DELETE,
      'Consultation',
      { 
        consultationId: params.id,
        reason: reason
      }
    )

    return NextResponse.json({
      message: 'Consulta cancelada com sucesso',
      consultation
    })

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_DELETE,
      'Consultation',
      error.message,
      { consultationId: params.id }
    )
    
    console.error('Erro ao cancelar consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('não podem ser canceladas')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
