/**
 * API Cron para envio automático de pesquisas NPS
 */

import { NextRequest, NextResponse } from 'next/server'
import { NpsService } from '@/lib/nps-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Verificar secret do cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Enviar pesquisas NPS para consultas concluídas recentemente
    const result = await NpsService.sendAutomaticSurveys()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    logger.error('Erro no cron de NPS:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar pesquisas' },
      { status: 500 }
    )
  }
}
