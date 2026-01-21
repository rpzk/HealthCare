import { NextResponse } from 'next/server'
import { PatientService } from '@/lib/patient-service'
import { withAuth, withDoctorAuth, AuthenticatedApiHandler, withRbac } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'
import { applyPatientMasking } from '@/lib/masking'
import { startSpan } from '@/lib/tracing'
import { requirePatientAccess } from '@/lib/patient-access'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// Lista de roles válidos
const validRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'HEALTH_AGENT', 'TECHNICIAN', 'PHARMACIST', 'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER', 'PATIENT'] as const

// Schema de validação para atualização de paciente
// NOTA: O modelo Patient só tem campo 'address' (texto), não city/state/zipCode separados
const updatePatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").nullable().optional(),
  phone: z.string().nullable().optional(),
  birthDate: z.string().transform((val) => {
    if (!val) return undefined
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error("Data de nascimento inválida")
    return date
  }).optional(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato XXX.XXX.XXX-XX").optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().nullable().optional(), // Endereço completo (texto único)
  emergencyContact: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  chronicDiseases: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  // Campo para atualizar o role do usuário vinculado
  userRole: z.enum(validRoles).optional(),
  userId: z.string().optional(),
})

// Schema para PATCH (ações administrativas simples)
const patchPatientSchema = z.object({
  action: z.enum(['deactivate','reactivate'])
})

// GET /api/patients/[id] - Buscar paciente por ID
export const GET = withRbac('patient.read', async (req, { params, user }) => {
  try {
    // Verificar se é uma requisição para edição (sem mascaramento)
    const url = new URL(req.url)
    const isEditMode = url.searchParams.get('edit') === 'true'
    
    // ============================================
    // CONTROLE DE ACESSO - LGPD
    // Verificar se o usuário tem acesso a este paciente
    // ============================================
    const accessCheck = await requirePatientAccess(user.id, params.id, user.role, isEditMode ? 'edit' : 'view')
    if (!accessCheck.allowed) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.PATIENT_READ,
        'Patient',
        'Acesso negado: não faz parte da equipe de atendimento',
        { patientId: params.id }
      )
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status || 403 }
      )
    }
    
    const patient = await startSpan('patient.get', () => PatientService.getPatientById(params.id))
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.PATIENT_READ,
      'Patient',
      { patientId: params.id, patientName: patient.name, editMode: isEditMode }
    )
    
    // Admin sempre vê dados completos sem mascaramento
    // Paciente vendo próprio perfil também vê tudo
    // Modo de edição também retorna tudo
    // Caso contrário, aplicar mascaramento LGPD
    const isAdmin = user.role === 'ADMIN'
    const isSelf = patient.userId === user.id
    
    if (isEditMode || isAdmin || isSelf) {
      return NextResponse.json(patient)
    }
    
    // Para outros casos, aplicar masking apropriado
    const clinicalRoles = ['DOCTOR', 'NURSE', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'HEALTH_AGENT']
    const exposeClinical = clinicalRoles.includes(user.role)
    
    return NextResponse.json(applyPatientMasking(patient, { exposeClinical }))
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
export const PUT = withRbac('patient.write', async (req, { params, user }) => {
  try {
    // ============================================
    // CONTROLE DE ACESSO - LGPD
    // ============================================
    const accessCheck = await requirePatientAccess(user.id, params.id, user.role, 'edit')
    if (!accessCheck.allowed) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.PATIENT_UPDATE,
        'Patient',
        'Acesso negado: não tem permissão para editar',
        { patientId: params.id }
      )
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status || 403 }
      )
    }
    
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

    // Extrair userRole e userId do validatedData para processar separadamente
    const { userRole, userId, ...patientData } = validatedData

    // Remove any fields explicitly set to null so PatientService.updatePatient receives undefined instead of null
    const safePatientData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patientData)) {
      if (v !== null) safePatientData[k] = v
    }

    // Validar se pelo menos um campo foi fornecido
    if (Object.keys(patientData).length === 0 && !userRole) {
      return NextResponse.json(
        { error: 'Pelo menos um campo deve ser fornecido para atualização' },
        { status: 400 }
      )
    }

    // Atualizar role do usuário vinculado se fornecido
    if (userRole && userId) {
      // Verificar se o usuário atual é ADMIN para alterar roles
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Apenas administradores podem alterar o papel de usuários' },
          { status: 403 }
        )
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: { role: userRole }
      })
      
      auditLogger.logSuccess(
        user.id,
        user.email,
        user.role,
        AuditAction.USER_UPDATE,
        'User',
        { 
          userId: userId,
          oldRole: 'unknown',
          newRole: userRole
        }
      )
    }

    // Atualizar paciente se houver dados para atualizar
    let patient
    if (Object.keys(patientData).length > 0) {
      patient = await startSpan('patient.update', () => PatientService.updatePatient(params.id, safePatientData))
    } else {
      // Buscar paciente atual se só atualizamos o role
      patient = await PatientService.getPatientById(params.id)
    }
    
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
    
    // Admin sempre recebe dados completos sem masking
    const isAdmin = user.role === 'ADMIN'
    
    // Headers para evitar cache após atualização
    return NextResponse.json(
      isAdmin ? patient : applyPatientMasking(patient),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
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
export const PATCH = withRbac('patient.write', async (req, { params, user }) => {
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

  // Funcionalidade ainda não implementada no serviço: responder 501
  return NextResponse.json({ error: `Ação '${action}' não implementada` }, { status: 501 })
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
export const DELETE = withRbac('patient.write', async (req, { params, user }) => {
  try {
    // ============================================
    // CONTROLE DE ACESSO - LGPD
    // Apenas FULL (médico responsável) ou ADMIN pode deletar
    // ============================================
    const accessCheck = await requirePatientAccess(user.id, params.id, user.role, 'delete')
    if (!accessCheck.allowed) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.PATIENT_DELETE,
        'Patient',
        'Acesso negado: não tem permissão para excluir',
        { patientId: params.id }
      )
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status || 403 }
      )
    }
    
  await startSpan('patient.delete', () => PatientService.deletePatient(params.id))
    
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
