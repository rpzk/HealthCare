import { NextRequest, NextResponse } from 'next/server'
import { paymentGateway } from '@/lib/payment-gateway-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Webhook do MercadoPago
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('[MercadoPago Webhook] Received:', body)

    // Validar assinatura do webhook (em produção)
    // const signature = request.headers.get('x-signature')
    // const requestId = request.headers.get('x-request-id')
    
    // Processar webhook
    const payment = await paymentGateway.processWebhook('mercadopago', body)

    if (!payment) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
    }

    // Buscar transação pelo external_reference
    const externalReference = body.external_reference || body.data?.external_reference

    if (externalReference) {
      const transaction = await prisma.financialTransaction.findFirst({
        where: { id: externalReference },
      })

      if (transaction) {
        // Atualizar status da transação
        await paymentGateway.updateTransactionFromPayment(transaction.id, payment)

        // Criar notificação para o paciente
        if (payment.status === 'approved' && transaction.patientId) {
          await prisma.notification.create({
            data: {
              userId: transaction.patientId,
              title: '✅ Pagamento Confirmado',
              message: `Seu pagamento de R$ ${payment.amount.toFixed(2)} foi aprovado!`,
              type: 'PAYMENT',
              read: false,
            }
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('[MercadoPago Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// GET - Verificação de health check
export async function GET() {
  return NextResponse.json({ status: 'ok', webhook: 'mercadopago' })
}
