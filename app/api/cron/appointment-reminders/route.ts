import { NextRequest, NextResponse } from 'next/server'
import { AppointmentConfirmationService } from '@/lib/appointment-confirmation-service'
import { logger } from '@/lib/logger'

/**
 * Endpoint para executar envio de lembretes manualmente
 * ou via cron job (ex: Vercel Cron, GitHub Actions)
 */
export async function POST(request: NextRequest) {
  try {
    // Validar token de autorização (para cron jobs externos)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-token'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('[Cron] Executando envio de lembretes...')
    
    await AppointmentConfirmationService.sendDailyReminders()

    return NextResponse.json({ 
      success: true, 
      message: 'Lembretes enviados com sucesso' 
    })
  } catch (error: any) {
    logger.error('[Cron] Erro:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar lembretes' },
      { status: 500 }
    )
  }
}

// GET - Status do serviço
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'appointment-reminders',
    schedule: 'Diário às 18h',
  })
}
