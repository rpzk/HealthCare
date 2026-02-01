import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paymentGateway } from '@/lib/payment-gateway-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const verifySchema = z.object({
  transactionId: z.string().min(1, 'ID da transação é obrigatório'),
  network: z.enum(['bitcoin', 'ethereum', 'tron']),
  txHash: z.string().min(10, 'Hash da transação inválido'),
  cryptoType: z.enum(['btc', 'eth', 'usdt']).optional(),
})

/**
 * POST /api/payments/crypto/verify
 * Verifica um pagamento crypto na blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = verifySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { transactionId, network, txHash, cryptoType } = parseResult.data

    // Buscar a transação financeira
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        description: true,
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    if (transaction.status === 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Transação já foi confirmada anteriormente',
        status: 'PAID'
      })
    }

    // Buscar endereço esperado baseado na rede
    // Como não temos metadata no modelo, usaremos as variáveis de ambiente
    let expectedAddress = ''
    let expectedAmount = Number(transaction.amount)
    
    // Usar endereços das variáveis de ambiente
    switch (network) {
      case 'bitcoin':
        expectedAddress = process.env.CRYPTO_BTC_ADDRESS || ''
        break
      case 'ethereum':
        if (cryptoType === 'usdt') {
          expectedAddress = process.env.CRYPTO_USDT_ADDRESS || ''
        } else {
          expectedAddress = process.env.CRYPTO_ETH_ADDRESS || ''
        }
        break
      case 'tron':
        expectedAddress = process.env.CRYPTO_USDT_ADDRESS || ''
        break
    }

    if (!expectedAddress) {
      return NextResponse.json(
        { error: 'Endereço de destino não configurado para esta rede' },
        { status: 400 }
      )
    }

    // Verificar na blockchain
    const verification = await paymentGateway.verifyCryptoPayment(
      network,
      txHash,
      expectedAmount,
      expectedAddress
    )

    logger.info('[CryptoVerify] Resultado:', {
      transactionId,
      network,
      txHash,
      verified: verification.verified,
      confirmations: verification.confirmations,
    })

    if (verification.verified) {
      // Atualizar transação como paga
      await prisma.financialTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'PAID',
          paidDate: new Date(),
          paymentMethod: `crypto_${network}_${cryptoType || network}`,
        }
      })

      logger.info('[CryptoVerify] Transação confirmada:', {
        transactionId,
        txHash,
        network,
        confirmations: verification.confirmations,
      })

      return NextResponse.json({
        success: true,
        verified: true,
        confirmations: verification.confirmations,
        message: 'Pagamento verificado e confirmado com sucesso!'
      })
    }

    // Pagamento não verificado ainda
    return NextResponse.json({
      success: true,
      verified: false,
      confirmations: verification.confirmations || 0,
      message: verification.error || 'Aguardando confirmações na blockchain',
      minConfirmations: network === 'bitcoin' ? 3 : network === 'ethereum' ? 12 : 19
    })

  } catch (error) {
    logger.error('Erro ao verificar pagamento crypto', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/crypto/verify
 * Verifica o status de uma transação pelo ID
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID da transação é obrigatório' },
        { status: 400 }
      )
    }

    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        paidDate: true,
        description: true,
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      paidDate: transaction.paidDate,
      description: transaction.description,
    })
  } catch (error) {
    logger.error('Erro ao buscar status de pagamento crypto', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

