/**
 * API de medicamento por ID
 * 
 * GET /api/medications/[id]
 * 
 * Retorna detalhes completos de um medicamento
 */

import { NextRequest, NextResponse } from 'next/server'
import { MedicationService } from '@/lib/medication-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const medication = await MedicationService.getById(id)

    if (!medication) {
      return NextResponse.json(
        { error: 'Medicamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(medication)
  } catch (error) {
    console.error('Erro ao buscar medicamento:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar medicamento' },
      { status: 500 }
    )
  }
}
