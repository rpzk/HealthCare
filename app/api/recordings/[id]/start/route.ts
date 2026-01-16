import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

/**
 * POST /api/recordings/[id]/start
 * Inicia gravação de teleconsulta
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

    const { patientConsent } = await request.json()

    if (!patientConsent) {
      return NextResponse.json(
        { error: 'Consentimento do paciente é obrigatório' },
        { status: 400 }
      )
    }

    // Enforce terms: professional + patient must have accepted required active docs
    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: TermAudience.PROFESSIONAL,
        gates: ['TELEMEDICINE', 'RECORDING'],
      })

      const consultation = await prisma.consultation.findUnique({
        where: { id: params.id },
        select: { patient: { select: { userId: true } } },
      })

      const patientUserId = consultation?.patient?.userId
      if (!patientUserId) {
        return NextResponse.json(
          { error: 'Paciente sem conta vinculada para aceite de termos', code: 'PATIENT_NO_USER' },
          { status: 403 }
        )
      }

      await assertUserAcceptedTerms({
        prisma,
        userId: patientUserId,
        audience: TermAudience.PATIENT,
        gates: ['TELEMEDICINE', 'RECORDING'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const recordingId = await TelemedicineRecordingService.startRecording(
      params.id, // consultationId
      patientConsent
    )

    return NextResponse.json({
      success: true,
      recordingId
    })

  } catch (error: unknown) {
    console.error('[Recording] Erro ao iniciar gravação:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar gravação' },
      { status: 500 }
    )
  }
}
