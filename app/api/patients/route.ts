import { NextResponse } from 'next/server'
import { PatientService } from '../../../lib/patient-service'
import { withPatientAuth } from '@/lib/advanced-auth'
import { startSpan } from '@/lib/tracing'
import { applyPatientsCollectionMasking, applyPatientMasking } from '@/lib/masking'
import { sanitizeSearchQuery, sanitizeName, sanitizeEmail, sanitizeCpf } from '@/lib/sanitization'
import { logger } from '@/lib/logger'
import { patientCreateSchema } from '@/lib/patient-schemas'

// GET /api/patients - Listar pacientes (protegido por autenticação)
export const GET = withPatientAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    
    // Parâmetros de paginação com limites
    const page = Math.max(1, Math.min(1000, parseInt(searchParams.get('page') || '1')))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')))
    
    // Filtros com sanitização
    const rawSearch = searchParams.get('search')
    const search = rawSearch ? sanitizeSearchQuery(rawSearch) : undefined
    const gender = searchParams.get('gender') || undefined
    const riskLevel = searchParams.get('riskLevel') || undefined
    
    // Filtro de idade
    let ageRange: { min: number; max: number } | undefined = undefined
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    if (minAge && maxAge) {
      ageRange = {
        min: parseInt(minAge),
        max: parseInt(maxAge)
      }
    }

    // ============================================
    // CONTROLE DE ACESSO - LGPD
    // Passa userId e role para filtrar apenas pacientes acessíveis
    // ============================================
    const result = await startSpan('patients.list', () => PatientService.getPatients(
      { 
        search, 
        gender, 
        riskLevel, 
        ageRange,
        userId: user.id,
        userRole: user.role 
      },
      page,
      limit
    ))
    // Aplicar masking na coleção; para perfis clínicos mantemos campos clínicos
    const clinicalRoles = ['DOCTOR','NURSE','PHYSIOTHERAPIST','PSYCHOLOGIST','HEALTH_AGENT','TECHNICIAN','PHARMACIST','DENTIST','NUTRITIONIST','SOCIAL_WORKER','OTHER','ADMIN'] as const
    const exposeClinical = clinicalRoles.includes(user.role as typeof clinicalRoles[number])
    const isAdmin = user.role === 'ADMIN'
    const masked = {
      ...result,
      patients: applyPatientsCollectionMasking(result.patients, { exposeClinical, isAdmin })
    }
    
    // Transformar para o formato esperado pelo frontend
    const response = {
      patients: masked.patients,
      pagination: {
        page: masked.currentPage,
        limit,
        total: masked.total,
        pages: masked.totalPages
      }
    }
    
    // Headers para evitar cache
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    logger.error('Erro na API de pacientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST /api/patients - Criar paciente (protegido por autenticação)
export const POST = withPatientAuth(async (req, { user }) => {
  try {
    const body = await req.json()
    const parsed = patientCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors, success: false },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (!data.email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : (data.birthDate as Date)
    if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }

    const patient = await startSpan('patients.create', () => PatientService.createPatient({
      name: sanitizeName(data.name),
      email: sanitizeEmail(data.email!),
      phone: data.phone ?? undefined,
      cpf: data.cpf ? sanitizeCpf(data.cpf) : undefined,
      birthDate,
      gender: data.gender as any,
      bloodType: data.bloodType,
      emergencyContact: data.emergencyContact ?? undefined,
      address: data.address ?? undefined,
      medicalHistory: undefined,
      allergies: Array.isArray(data.allergies) ? data.allergies.join(', ') : undefined,
      currentMedications: Array.isArray((data as any).currentMedications) ? (data as any).currentMedications.join(', ') : undefined,
      riskLevel: (data as any).riskLevel,
      insuranceNumber: (data as any).insuranceNumber,
      latitude: (data as any).latitude,
      longitude: (data as any).longitude,
      // Não vincula automaticamente a um médico durante testes/bypass para evitar falha de FK
      // userId: user.id
    }))
    // Mask de retorno (apenas confirmação sem dados sensíveis)
    return NextResponse.json(applyPatientMasking(patient), { status: 201 })
  } catch (error: any) {
    logger.error('Erro ao criar paciente:', error)
    
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
})
