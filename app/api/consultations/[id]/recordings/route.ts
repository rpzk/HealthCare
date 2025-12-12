import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'

/**
 * GET /api/consultations/[id]/recordings
 * Lista gravações de uma consulta
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const recordings = await TelemedicineRecordingService.getConsultationRecordings(
      params.id
    )

    // Gerar URLs de acesso para cada gravação
    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording: any) => {
        if (recording.status === 'COMPLETED') {
          try {
            const url = await TelemedicineRecordingService.getRecordingUrl(
              recording.id,
              session.user.id
            )
            return { ...recording, url }
          } catch {
            return { ...recording, url: null }
          }
        }
        return { ...recording, url: null }
      })
    )

    return NextResponse.json({
      recordings: recordingsWithUrls
    })

  } catch (error: unknown) {
    console.error('[Recording] Erro ao listar gravações:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar gravações' },
      { status: 500 }
    )
  }
}
