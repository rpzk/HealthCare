/**
 * API de estatísticas de medicamentos
 * 
 * GET /api/medications/stats
 * 
 * Retorna estatísticas do catálogo de medicamentos:
 * - Total de medicamentos
 * - Distribuição por tipo de receita
 * - Distribuição por disponibilidade
 * - Distribuição por via de administração
 * - Medicamentos com restrições
 */

import { NextResponse } from 'next/server'
import { MedicationService } from '@/lib/medication-service'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const [
      statistics,
      prescriptionTypes,
      routes,
      forms
    ] = await Promise.all([
      MedicationService.getStatistics(),
      MedicationService.listPrescriptionTypes(),
      MedicationService.listRoutes(),
      MedicationService.listForms()
    ])

    return NextResponse.json({
      ...statistics,
      prescriptionTypes,
      routes,
      forms
    })
  } catch (error) {
    logger.error('Erro ao obter estatísticas de medicamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
