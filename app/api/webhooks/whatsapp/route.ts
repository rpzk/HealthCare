import { NextRequest, NextResponse } from 'next/server'
import { AppointmentConfirmationService } from '@/lib/appointment-confirmation-service'
import { logger } from '@/lib/logger'

/**
 * Webhook para receber mensagens do WhatsApp
 * Processa confirmações de consultas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('[WhatsApp Webhook] Received:', body)

    // Estrutura varia por provider (Evolution API, Twilio, etc.)
    // Exemplo para Evolution API:
    const message = body.message || body.data?.message
    const from = body.key?.remoteJid || body.from || body.data?.from
    const messageText = message?.conversation || message?.extendedTextMessage?.text || message?.text

    if (!from || !messageText) {
      return NextResponse.json({ received: true })
    }

    // Remover código do país e formatação
    const phoneNumber = from.replace(/\D/g, '').replace(/^55/, '')

    // Processar confirmação
    await AppointmentConfirmationService.processConfirmation(phoneNumber, messageText)

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('[WhatsApp Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// GET - Verificação de health check
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'whatsapp-confirmations' })
}
