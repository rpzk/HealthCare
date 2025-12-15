/**
 * API: Gerar Relatório de Produção Mensal (SIAB-PM)
 * POST /api/sus/reports/monthly
 */

import { NextRequest, NextResponse } from 'next/server'
import { SUSReportsService } from '@/lib/sus-reports-service'

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

    const report = await SUSReportsService.generateMonthlyProductionReport({
      healthUnitId,
      month: parseInt(month),
      year: parseInt(year)
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('[SUS] Erro ao gerar relatório mensal:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório mensal' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const healthUnitId = searchParams.get('healthUnitId')

    if (!healthUnitId) {
      return NextResponse.json(
        { error: 'healthUnitId é obrigatório' },
        { status: 400 }
      )
    }

    const reports = await SUSReportsService.getMonthlyReportsByUnit(healthUnitId)

    return NextResponse.json(reports, { status: 200 })
  } catch (error) {
    console.error('[SUS] Erro ao buscar relatórios mensais:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
      { status: 500 }
    )
  }
}
