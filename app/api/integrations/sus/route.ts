import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SUSService } from '@/lib/integration-services'
import { authOptions } from '@/auth'
import { logger } from '@/lib/logger'

/**
 * POST /api/integrations/sus/register
 * Register medical certificate with SUS registry
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { certificateId, susRegistration } = body

    if (!certificateId || !susRegistration) {
      return NextResponse.json(
        {
          error: 'Missing required fields: certificateId, susRegistration'
        },
        { status: 400 }
      )
    }

    // Validate SUS number format (typically 14 digits)
    if (!/^\d{14}$/.test(susRegistration.replace(/\D/g, ''))) {
      return NextResponse.json(
        {
          error: 'Invalid SUS number format. Expected 14 digits.'
        },
        { status: 400 }
      )
    }

    const result = await SUSService.registerMedicalRecord(
      certificateId,
      susRegistration
    )

    if (result.success) {
      return NextResponse.json(result)
    }

    const errorMessage = result.error || 'Erro na integração com SUS'
    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      errorMessage.includes('não encontrado') ? 404 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[SUS API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/sus/patient-history
 * Query patient medical history from SUS
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cpf = req.nextUrl.searchParams.get('cpf')
    const susNumber = req.nextUrl.searchParams.get('sus_number')

    if (!cpf || !susNumber) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters: cpf, sus_number'
        },
        { status: 400 }
      )
    }

    const result = await SUSService.getPatientHistory(cpf, susNumber)

    const errorMessage = result.error
    if (!errorMessage) {
      return NextResponse.json(result)
    }

    const status =
      errorMessage.includes('não configurada') ? 503 :
      errorMessage.includes('not yet configured') ? 503 :
      errorMessage.includes('não implementada') ? 501 :
      500

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error('[SUS History API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
