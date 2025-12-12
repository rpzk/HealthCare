import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paymentGateway, PaymentProvider } from '@/lib/payment-gateway-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validação
const createPaymentLinkSchema = z.object({
  transactionId: z.string(),
  provider: z.enum(['mercadopago', 'stripe', 'pagseguro', 'pix']),
  installments: z.number().min(1).max(12).optional(),
  sendWhatsApp: z.boolean().optional(),
})

// POST - Criar link de pagamento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Apenas admin, manager e receptionist podem gerar links
    const allowedRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createPaymentLinkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { transactionId, provider, installments, sendWhatsApp } = validation.data

    // Buscar transação
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      include: {
        patient: true,
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    if (transaction.status === 'PAID') {
      return NextResponse.json({ error: 'Transação já paga' }, { status: 400 })
    }

    // Criar link de pagamento
    const result = await paymentGateway.createPaymentLink(provider, {
      amount: Number(transaction.amount),
      description: transaction.description,
      patientEmail: transaction.patient?.email,
      patientName: transaction.patient?.name,
      patientPhone: transaction.patient?.phone || undefined,
      transactionId: transaction.id,
      installments,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Salvar informação do pagamento
    await prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        paymentMethod: `${provider.toUpperCase()} - ${result.paymentId || 'PIX'}`,
      }
    })

    // Enviar por WhatsApp se solicitado
    if (sendWhatsApp && result.paymentUrl && transaction.patient?.phone) {
      await paymentGateway.sendPaymentLinkWhatsApp(
        transaction.patient.phone,
        transaction.patient.name,
        result.paymentUrl,
        Number(transaction.amount)
      )
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      paymentUrl: result.paymentUrl,
      qrCode: result.qrCode,
      qrCodeData: result.qrCodeData,
      pixKey: result.pixKey,
    })
  } catch (error) {
    console.error('[Payment API] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar link de pagamento' },
      { status: 500 }
    )
  }
}

// GET - Verificar status de pagamento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const provider = searchParams.get('provider') as PaymentProvider

    if (!paymentId || !provider) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const status = await paymentGateway.checkPaymentStatus(provider, paymentId)

    return NextResponse.json({ status })
  } catch (error) {
    console.error('[Payment API] Error checking status:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
