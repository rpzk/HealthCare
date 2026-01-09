import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms, TermsNotAcceptedError, TermsNotConfiguredError } from '@/lib/terms-enforcement'

/**
 * POST /api/recordings/[id]/stop
 * Finaliza gravação de teleconsulta
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: TermAudience.PROFESSIONAL,
        gates: ['TELEMEDICINE', 'RECORDING'],
      })
    } catch (e) {
      if (e instanceof TermsNotAcceptedError) {
        return NextResponse.json(
          {
            error: e.message,
            code: e.code,
            missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
          },
          { status: 403 }
        )
      }
      if (e instanceof TermsNotConfiguredError) {
        return NextResponse.json(
          { error: e.message, code: e.code, missing: e.missing },
          { status: 503 }
        )
      }
      throw e
    }

    const { duration } = await request.json()

    const filePath = await TelemedicineRecordingService.stopRecording(
      params.id, // recordingId
      duration
    )

    return NextResponse.json({
      success: true,
      filePath
    })

  } catch (error: unknown) {
    console.error('[Recording] Erro ao finalizar gravação:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao finalizar gravação' },
      { status: 500 }
    )
  }
}
