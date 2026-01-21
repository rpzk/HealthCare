/**
 * API: Gerar Relatório de Situação de Saúde (SIAB-SS)
 * POST /api/sus/reports/health-situation
 */

import { NextRequest, NextResponse } from 'next/server'
import { SUSReportsService } from '@/lib/sus-reports-service'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { healthUnitId, month, year } = body

    if (!healthUnitId || !month || !year) {
      return NextResponse.json(
        { error: 'healthUnitId, month e year são obrigatórios' },
        { status: 400 }
      )
    }

    const report = await SUSReportsService.generateHealthSituationReport({
      healthUnitId,
      month: parseInt(month),
      year: parseInt(year)
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    logger.error('[SUS] Erro ao gerar relatório de situação de saúde:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
