import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'

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
