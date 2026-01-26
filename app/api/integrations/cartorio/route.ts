import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { CartorioService } from '@/lib/integration-services'
import { authOptions } from '@/auth'
import { logger } from '@/lib/logger'

/**
 * POST /api/integrations/cartorio/submit
 * Submit medical certificate to Cartório for digital filing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { certificateId, cartorioId, registrationType } = body

    if (!certificateId || !cartorioId || !registrationType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: certificateId, cartorioId, registrationType'
        },
        { status: 400 }
      )
    }

    const validTypes = ['REGISTRATION', 'FILING', 'CERTIFICATION']
    if (!validTypes.includes(registrationType)) {
      return NextResponse.json(
        {
          error: `Invalid registrationType. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    const result = await CartorioService.submitCertificate(
      certificateId,
      cartorioId,
      registrationType
    )

    if (result.success) {
      return NextResponse.json(result)
    }

    const errorMessage = result.error || 'Erro na integração com Cartório'
    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      errorMessage.includes('não encontrado') ? 404 :
      errorMessage.includes('revogado') ? 409 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[Cartório API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/cartorio/status/[protocolNumber]
 * Check Cartório submission status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { protocolNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { protocolNumber } = params
    const cartorioId = req.nextUrl.searchParams.get('cartorioId')

    if (!cartorioId) {
      return NextResponse.json(
        { error: 'Missing cartorioId query parameter' },
        { status: 400 }
      )
    }

    const result = await CartorioService.checkSubmissionStatus(
      protocolNumber,
      cartorioId
    )

    const errorMessage = result.error
    if (!errorMessage) {
      return NextResponse.json(result)
    }

    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[Cartório Status API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
