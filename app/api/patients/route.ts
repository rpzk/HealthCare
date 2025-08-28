import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '../../../lib/patient-service'
import { validateRequestBody } from '../../../lib/with-auth'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { validatePatient } from '../../../lib/validation-schemas'

// GET /api/patients - Listar pacientes (protegido por autenticação)
export const GET = withPatientAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Filtros
  const search = searchParams.get('search') || undefined
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

    const result = await PatientService.getPatients(
      { search, gender, riskLevel, ageRange },
      page,
      limit
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro na API de pacientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST /api/patients - Criar paciente (protegido por autenticação)
export const POST = withPatientAuth(async (req: NextRequest, { user }) => {
  try {
    // Validar dados de entrada
    const validation = await validateRequestBody(req, validatePatient)
    if (!validation.success) {
      return validation.response!
    }

    const data = validation.data!

    if (!data.email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : (data.birthDate as Date)
    if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }

    const patient = await PatientService.createPatient({
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birthDate,
      gender: data.gender as any,
      emergencyContact: data.emergencyContact,
      address: data.address,
      medicalHistory: undefined,
      allergies: Array.isArray(data.allergies) ? data.allergies.join(', ') : undefined,
      currentMedications: Array.isArray((data as any).currentMedications) ? (data as any).currentMedications.join(', ') : undefined,
      riskLevel: (data as any).riskLevel,
      insuranceNumber: (data as any).insuranceNumber,
      userId: user.id
    })
    
    return NextResponse.json(patient, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar paciente:', error)
    
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
