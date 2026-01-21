import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/recordings/[id]
 * Exclui gravação (soft delete)
 */
export async function DELETE(
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

    await TelemedicineRecordingService.deleteRecording(
      params.id,
      session.user.id
    )

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    logger.error('[Recording] Erro ao excluir gravação:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir gravação' },
      { status: 500 }
    )
  }
}
