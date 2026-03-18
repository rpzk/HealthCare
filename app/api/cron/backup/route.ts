export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { scheduledDailyBackup, scheduledWeeklyCleanup } from '@/lib/backup-orchestrator'
import { logger } from '@/lib/logger'

/**
 * POST /api/cron/backup
 *
 * Executa backup automatizado do banco de dados e arquivos.
 * Deve ser chamado diariamente via GitHub Actions ou cron externo.
 *
 * Body (opcional): { type: 'daily' | 'cleanup' }
 * Padrão: 'daily'
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron/Backup] CRON_SECRET não configurada — endpoint desabilitado por segurança')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { type?: string }
  const type = body.type ?? 'daily'

  try {
    if (type === 'cleanup') {
      logger.info('[Cron/Backup] Iniciando limpeza semanal de backups antigos...')
      await scheduledWeeklyCleanup()
      return NextResponse.json({ success: true, type: 'cleanup' })
    }

    logger.info('[Cron/Backup] Iniciando backup diário...')
    await scheduledDailyBackup()
    return NextResponse.json({ success: true, type: 'daily' })
  } catch (error: any) {
    logger.error('[Cron/Backup] Falha no backup:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro no backup' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'backup',
    schedule: 'Diário às 02h (daily), Domingo às 03h (cleanup)',
  })
}
