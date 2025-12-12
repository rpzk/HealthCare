import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TelemedicineRecordingService } from '@/lib/telemedicine-recording-service'
import fs from 'fs/promises'

/**
 * GET /api/recordings/[id]/stream
 * Stream de vídeo da gravação (com autenticação por token)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    // Validar token de acesso
    const isValid = await TelemedicineRecordingService.validateAccessToken(
      params.id,
      token
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 403 }
      )
    }

    // Obter arquivo
    const prisma = (await import('@prisma/client')).PrismaClient
    const db = new prisma()
    
    const recording = await db.telemedicineRecording.findUnique({
      where: { id: params.id }
    })

    if (!recording || !recording.filePath) {
      return NextResponse.json(
        { error: 'Gravação não encontrada' },
        { status: 404 }
      )
    }

    // Ler arquivo
    const fileBuffer = await fs.readFile(recording.filePath)

    // Retornar stream
    return new NextResponse(fileBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Length': recording.fileSize?.toString() || fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${recording.fileName}"`,
        'Cache-Control': 'private, no-cache',
      }
    })

  } catch (error: unknown) {
    console.error('[Recording] Erro ao fazer stream:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao fazer stream' },
      { status: 500 }
    )
  }
}
