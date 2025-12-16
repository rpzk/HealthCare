/**
 * API para gerenciar sala de espera virtual
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WaitingRoomService } from '@/lib/waiting-room-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { doctorId, consultationId, priority } = body

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId obrigatório' }, { status: 400 })
    }

    await WaitingRoomService.joinWaitingRoom({
      patientId: session.user.id,
      doctorId,
      consultationId,
      priority,
    })

    // Obter posição na fila
    const position = await WaitingRoomService.getPatientPosition(
      session.user.id,
      doctorId
    )

    return NextResponse.json({
      success: true,
      position,
    })
  } catch (error: any) {
    console.error('Erro ao entrar na sala de espera:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao entrar na sala de espera' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const type = searchParams.get('type') // 'list' ou 'position'

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId obrigatório' }, { status: 400 })
    }

    if (type === 'position') {
      // Obter posição do paciente
      const position = await WaitingRoomService.getPatientPosition(
        session.user.id,
        doctorId
      )

      return NextResponse.json({
        success: true,
        position,
      })
    } else {
      // Listar todos os pacientes na fila (apenas para médicos)
      if (session.user.id !== doctorId && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }

      const patients = await WaitingRoomService.getWaitingList(doctorId)

      return NextResponse.json({
        success: true,
        patients,
      })
    }
  } catch (error: any) {
    console.error('Erro ao consultar sala de espera:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar sala de espera' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId obrigatório' }, { status: 400 })
    }

    await WaitingRoomService.leaveWaitingRoom(session.user.id, doctorId)

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Erro ao sair da sala de espera:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sair da sala de espera' },
      { status: 500 }
    )
  }
}
