import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/lib/patient-service'
import { withAuth, withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { BloodType } from '@prisma/client'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// Schema de validação para atualização de paciente
const updatePatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  birthDate: z.string().transform((val) => {
    if (!val) return undefined
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error("Data de nascimento inválida")
    return date
  }).optional(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato XXX.XXX.XXX-XX").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  bloodType: z.nativeEnum(BloodType).optional(),
  allergies: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional()
})

// GET /api/patients/[id] - Buscar paciente por ID
export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  try {
    const patient = await PatientService.getPatientById(params.id)
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_READ,
      'Patient',
      { patientId: params.id, patientName: patient.name }
    )
    
    return NextResponse.json(patient)
  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_READ,
      'Patient',
      error.message,
      { patientId: params.id }
    )
    
    console.error('Erro ao buscar paciente:', error)
    
    if (error.message === 'Paciente não encontrado') {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// PUT /api/patients/[id] - Atualizar paciente
export const PUT = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  try {
    const data = await req.json()
    
    // Validação com Zod
    const validationResult = updatePatientSchema.safeParse(data)
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

    const patient = await PatientService.updatePatient(params.id, validatedData)
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_UPDATE,
      'Patient',
      { 
        patientId: params.id,
        updatedFields: Object.keys(validatedData),
        patientName: patient.name
      }
    )
    
    return NextResponse.json(patient)
  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_UPDATE,
      'Patient',
      error.message,
      { patientId: params.id }
    )
    
    console.error('Erro ao atualizar paciente:', error)
    
    if (error.message === 'Paciente não encontrado') {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }
    
    if (error.message.includes('já existe')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// PATCH /api/patients/[id] - Desativar/Reativar paciente
export const PATCH = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  try {
    const data = await req.json()
    
    // Validação com Zod
    const validationResult = patchPatientSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ')
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const { action } = validationResult.data

    if (action === 'deactivate') {
      const patient = await PatientService.deactivatePatient(params.id)
      
      auditLogger.logSuccess(
        user.id,
        user.email,
        user.role,
        AuditAction.PATIENT_UPDATE,
        'Patient',
        { patientId: params.id, patientName: patient.name, action: 'deactivate' }
      )
      
      return NextResponse.json({ 
        message: 'Paciente desativado com sucesso',
        patient 
      })
    } else if (action === 'reactivate') {
      const patient = await PatientService.reactivatePatient(params.id)
      
      auditLogger.logSuccess(
        user.id,
        user.email,
        user.role,
        AuditAction.PATIENT_UPDATE,
        'Patient',
        { patientId: params.id, patientName: patient.name, action: 'reactivate' }
      )
      
      return NextResponse.json({ 
        message: 'Paciente reativado com sucesso',
        patient 
      })
    }
  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_UPDATE,
      'Patient',
      error.message,
      { patientId: params.id }
    )
    
    console.error('Erro na operação do paciente:', error)
    
    if (error.message === 'Paciente não encontrado') {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// DELETE /api/patients/[id] - Excluir paciente (hard delete - use com cuidado)
export const DELETE = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  try {
    await PatientService.deletePatient(params.id)
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_DELETE,
      'Patient',
      { patientId: params.id }
    )
    
    return NextResponse.json({ 
      message: 'Paciente excluído com sucesso'
    })
  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_DELETE,
      'Patient',
      error.message,
      { patientId: params.id }
    )
    
    console.error('Erro ao excluir paciente:', error)
    
    if (error.message === 'Paciente não encontrado') {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
