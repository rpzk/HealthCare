import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { GovernmentProtocolService } from '@/lib/integration-services'
import { authOptions } from '@/auth'

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

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Government Protocol API Error]', error)
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Government Verify API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
