import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'

/**
 * POST /api/recordings/[id]/chunk
 * Salva chunk de dados da gravação
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

    const formData = await request.formData()
    const chunk = formData.get('chunk') as Blob
    const sequenceNumber = parseInt(formData.get('sequenceNumber') as string)

    if (!chunk || isNaN(sequenceNumber)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await chunk.arrayBuffer())

    await TelemedicineRecordingService.saveRecordingChunk(
      params.id, // recordingId
      buffer,
      sequenceNumber
    )

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('[Recording] Erro ao salvar chunk:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar chunk' },
      { status: 500 }
    )
  }
}
