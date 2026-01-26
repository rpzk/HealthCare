import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { GovernmentProtocolService } from '@/lib/integration-services'
import { authOptions } from '@/auth'
import { logger } from '@/lib/logger'

type ProtocolType =
  | 'LABOR_PERMISSION'
  | 'LEGAL_PROCEEDING'
  | 'SOCIAL_BENEFIT'
  | 'OFFICIAL_RECORD'

/**
 * POST /api/integrations/government/submit
 * Submit medical certificate to government protocol system
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { certificateId, protocolType } = body

    if (!certificateId || !protocolType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: certificateId, protocolType'
        },
        { status: 400 }
      )
    }

    const validTypes: ProtocolType[] = [
      'LABOR_PERMISSION',
      'LEGAL_PROCEEDING',
      'SOCIAL_BENEFIT',
      'OFFICIAL_RECORD'
    ]

    if (!validTypes.includes(protocolType as ProtocolType)) {
      return NextResponse.json(
        {
          error: `Invalid protocolType. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    const result = await GovernmentProtocolService.submitProtocol(
      certificateId,
      protocolType as ProtocolType
    )

    if (result.success) {
      return NextResponse.json(result)
    }

    const errorMessage = result.error || 'Erro na integração com Protocolo do Governo'
    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      errorMessage.includes('não encontrado') ? 404 :
      errorMessage.includes('revogado') ? 409 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[Government Protocol API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/government/verify
 * Verify government protocol submission
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const governmentProtocolId =
      req.nextUrl.searchParams.get('protocol_id')

    if (!governmentProtocolId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameter: protocol_id'
        },
        { status: 400 }
      )
    }

    const result = await GovernmentProtocolService.verifyProtocol(
      governmentProtocolId
    )

    const errorMessage = result.error
    if (!errorMessage) {
      return NextResponse.json(result)
    }

    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      errorMessage.includes('not yet configured') ? 503 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[Government Verify API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
