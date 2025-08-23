import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '../../../../lib/patient-service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/patients/[id] - Buscar paciente por ID
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const patient = await PatientService.getPatientById(params.id)
    return NextResponse.json(patient)
  } catch (error: any) {
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
}

// PUT /api/patients/[id] - Atualizar paciente
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const data = await req.json()

    // Validar email format (se fornecido)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validar CPF format (se fornecido)
    if (data.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf)) {
      return NextResponse.json(
        { error: 'CPF deve estar no formato XXX.XXX.XXX-XX' },
        { status: 400 }
      )
    }

    const patient = await PatientService.updatePatient(params.id, data)
    return NextResponse.json(patient)
  } catch (error: any) {
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
}

// PATCH /api/patients/[id] - Desativar/Reativar paciente
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { action } = await req.json()

    if (action === 'deactivate') {
      const patient = await PatientService.deactivatePatient(params.id)
      return NextResponse.json({ 
        message: 'Paciente desativado com sucesso',
        patient 
      })
    } else if (action === 'reactivate') {
      const patient = await PatientService.reactivatePatient(params.id)
      return NextResponse.json({ 
        message: 'Paciente reativado com sucesso',
        patient 
      })
    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use "deactivate" ou "reactivate"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
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
}
