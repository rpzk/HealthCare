import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '../../../lib/patient-service'
import { Gender, BloodType } from '@prisma/client'

// GET /api/patients - Listar pacientes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Filtros
    const search = searchParams.get('search') || undefined
    const bloodType = searchParams.get('bloodType') as BloodType || undefined
    const gender = searchParams.get('gender') as Gender || undefined
    const isActive = searchParams.get('isActive') === 'true' ? true : 
                    searchParams.get('isActive') === 'false' ? false : undefined
    
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
      { search, bloodType, gender, isActive, ageRange },
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
}

// POST /api/patients - Criar paciente
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validações básicas
    if (!data.name || !data.cpf || !data.birthDate || !data.gender || !data.doctorId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, cpf, birthDate, gender, doctorId' },
        { status: 400 }
      )
    }

    // Validar CPF format
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf)) {
      return NextResponse.json(
        { error: 'CPF deve estar no formato XXX.XXX.XXX-XX' },
        { status: 400 }
      )
    }

    // Validar email format (se fornecido)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    const patient = await PatientService.createPatient(data)
    
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
}
