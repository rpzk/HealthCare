import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'

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
