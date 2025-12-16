/**
 * API: Gerar Relatório de Produção Diária (SIAB-AD)
 * POST /api/sus/reports/daily
 */

import { NextRequest, NextResponse } from 'next/server'
import { SUSReportsService } from '@/lib/sus-reports-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { healthUnitId, reportDate, professionalId } = body

    if (!healthUnitId || !reportDate) {
      return NextResponse.json(
        { error: 'healthUnitId e reportDate são obrigatórios' },
        { status: 400 }
      )
    }

    const report = await SUSReportsService.generateDailyProductionReport({
      healthUnitId,
      reportDate: new Date(reportDate),
      professionalId
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('[SUS] Erro ao gerar relatório diário:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório diário' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const healthUnitId = searchParams.get('healthUnitId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!healthUnitId) {
      return NextResponse.json(
        { error: 'healthUnitId é obrigatório' },
        { status: 400 }
      )
    }

    const reports = await SUSReportsService.getDailyReportsByUnit(
      healthUnitId,
      month && year ? { month: parseInt(month), year: parseInt(year) } : undefined
    )

    return NextResponse.json(reports, { status: 200 })
  } catch (error) {
    console.error('[SUS] Erro ao buscar relatórios diários:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
      { status: 500 }
    )
  }
}
