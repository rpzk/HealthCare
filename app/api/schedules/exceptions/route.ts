/**
 * GET /api/schedules/exceptions - Lista exceções do profissional
 * POST /api/schedules/exceptions - Cria exceções (intervalo de datas)
 * DELETE /api/schedules/exceptions?id=xxx - Remove exceção
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const exceptions = await prisma.scheduleException.findMany({
      where: { doctorId: session.user.id as string },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        blockType: true,
        reason: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      exceptions: exceptions.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        blockType: e.blockType,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[schedules/exceptions GET]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar bloqueios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, blockType, reason } = body as {
      startDate?: string
      endDate?: string
      blockType?: string
      reason?: string
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 })
    }

    const type = blockType || 'UNAVAILABLE'
    const validTypes = [
      'UNAVAILABLE',
      'VACATION',
      'SICK_LEAVE',
      'ON_CALL',
      'MEETING',
      'TRAINING',
      'MAINTENANCE',
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'blockType inválido' }, { status: 400 })
    }

    const doctorId = session.user.id as string
    let created = 0

    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const dayStart = startOfDay(d)
      const existing = await prisma.scheduleException.findFirst({
        where: { doctorId, date: dayStart },
      })
      if (existing) {
        await prisma.scheduleException.update({
          where: { id: existing.id },
          data: { blockType: type as any, reason: reason || undefined },
        })
      } else {
        await prisma.scheduleException.create({
          data: {
            doctorId,
            date: dayStart,
            blockType: type as any,
            reason: reason || undefined,
          },
        })
        created++
      }
    }

    return NextResponse.json({ success: true, created })
  } catch (error) {
    console.error('[schedules/exceptions POST]', error)
    return NextResponse.json(
      { error: 'Erro ao criar bloqueio' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    const deleted = await prisma.scheduleException.deleteMany({
      where: {
        id,
        doctorId: session.user.id as string,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Bloqueio não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[schedules/exceptions DELETE]', error)
    return NextResponse.json(
      { error: 'Erro ao remover bloqueio' },
      { status: 500 }
    )
  }
}
