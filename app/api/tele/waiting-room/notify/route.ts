/**
 * API para notificar paciente que é sua vez
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WaitingRoomService } from '@/lib/waiting-room-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, meetingLink } = body

    if (!patientId || !meetingLink) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Apenas médicos podem notificar
    if (session.user.role !== 'DOCTOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const success = await WaitingRoomService.notifyPatientReady(
      patientId,
      session.user.id,
      meetingLink
    )

    return NextResponse.json({
      success,
    })
  } catch (error: any) {
    logger.error('Erro ao notificar paciente:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao notificar paciente' },
      { status: 500 }
    )
  }
}
