/**
 * API de eventos do calendário
 * 
 * GET /api/calendar/events
 * 
 * Parâmetros:
 * - start: Data de início (ISO string)
 * - end: Data de fim (ISO string)
 * - doctorId: ID do médico (opcional, usa o usuário logado)
 * - status: Filtrar por status (opcional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMinutes } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const doctorId = searchParams.get('doctorId') || session.user.id
    const status = searchParams.get('status')

    // Validar datas
    if (!startStr || !endStr) {
      return NextResponse.json(
        { error: 'Parâmetros start e end são obrigatórios' },
        { status: 400 }
      )
    }

    const start = new Date(startStr)
    const end = new Date(endStr)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Datas inválidas' },
        { status: 400 }
      )
    }

    // Construir filtro
    const where: any = {
      scheduledDate: {
        gte: start,
        lte: end,
      },
    }

    // Filtrar por médico (para médicos, mostra só suas consultas; para admin, pode ver todas)
    if (session.user.role !== 'ADMIN') {
      where.doctorId = doctorId
    } else if (doctorId && doctorId !== session.user.id) {
      where.doctorId = doctorId
    }

    // Filtrar por status
    if (status) {
      where.status = status
    }

    // Buscar consultas
    const consultations = await prisma.consultation.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // Formatar eventos para o calendário
    const events = consultations.map((consultation) => {
      const duration = consultation.duration || 30 // duração padrão de 30 minutos
      const startDate = new Date(consultation.scheduledDate)
      const endDate = addMinutes(startDate, duration)

      return {
        id: consultation.id,
        title: consultation.patient.name,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        status: consultation.status,
        type: consultation.type,
        patient: {
          id: consultation.patient.id,
          name: consultation.patient.name,
          phone: consultation.patient.phone,
        },
        doctor: consultation.doctor ? {
          id: consultation.doctor.id,
          name: consultation.doctor.name,
        } : null,
      }
    })

    return NextResponse.json({ events })

  } catch (error) {
    console.error('[Calendar Events] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 }
    )
  }
}
