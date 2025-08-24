import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '../../../lib/patient-service'
import { withAuth, validateRequestBody } from '../../../lib/with-auth'
import { validatePatient } from '../../../lib/validation-schemas'
import { Gender, BloodType } from '@prisma/client'

// GET /api/patients - Listar pacientes (protegido por autenticação)
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Filtros
    const search = searchParams.get('search') || undefined
    const bloodType = searchParams.get('bloodType') as BloodType || undefined
    const gender = searchParams.get('gender') as Gender || undefined
    
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
      { search, bloodType, gender, ageRange },
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
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Validar dados de entrada
    const validation = await validateRequestBody(req, validatePatient)
    if (!validation.success) {
      return validation.response!
    }

    const data = validation.data!

    // Garantir que o médico logado seja associado ao paciente
    data.doctorId = user.id

    // Garantir que a data de nascimento seja um objeto Date
    if (typeof data.birthDate === 'string') {
      data.birthDate = new Date(data.birthDate)
    }

    // Criar dados formatados para o serviço
    const patientData = {
      ...data,
      birthDate: data.birthDate as Date,
      allergies: data.allergies || [],
      chronicDiseases: data.chronicDiseases || []
    }

    const patient = await PatientService.createPatient(patientData)
    
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
