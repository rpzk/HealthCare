/**
 * API de validação de prescrição de medicamento
 * 
 * POST /api/medications/validate
 * 
 * Body:
 * {
 *   medicationId: string,
 *   patientAge: number,
 *   patientSex: 'M' | 'F'
 * }
 * 
 * Retorna validação com warnings e errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { MedicationService } from '@/lib/medication-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { medicationId, patientAge, patientSex } = body

    if (!medicationId) {
      return NextResponse.json(
        { error: 'ID do medicamento é obrigatório' },
        { status: 400 }
      )
    }

    if (patientAge === undefined || patientAge === null) {
      return NextResponse.json(
        { error: 'Idade do paciente é obrigatória' },
        { status: 400 }
      )
    }

    if (!patientSex || !['M', 'F'].includes(patientSex)) {
      return NextResponse.json(
        { error: 'Sexo do paciente deve ser M ou F' },
        { status: 400 }
      )
    }

    const validation = await MedicationService.validatePrescription(
      medicationId,
      patientAge,
      patientSex
    )

    return NextResponse.json(validation)
  } catch (error) {
    console.error('Erro na validação de prescrição:', error)
    return NextResponse.json(
      { error: 'Erro ao validar prescrição' },
      { status: 500 }
    )
  }
}
