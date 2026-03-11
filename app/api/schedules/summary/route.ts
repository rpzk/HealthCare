/**
 * GET /api/schedules/summary
 * Resumo da agenda do profissional: horários aprovados + bloqueios/férias próximos
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const BLOCK_LABELS: Record<string, string> = {
  UNAVAILABLE: 'Indisponível',
  VACATION: 'Férias',
  SICK_LEAVE: 'Licença médica',
  ON_CALL: 'Plantão',
  MEETING: 'Reunião',
  TRAINING: 'Treinamento',
  MAINTENANCE: 'Manutenção',
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string

    const [schedules, exceptions] = await Promise.all([
      prisma.professionalSchedule.findMany({
        where: {
          professionalId: userId,
          status: 'APPROVED',
          isActive: true,
        },
        orderBy: { dayOfWeek: 'asc' },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          serviceType: true,
        },
      }),
      prisma.scheduleException.findMany({
        where: {
          doctorId: userId,
          date: {
            gte: startOfDay(new Date()),
            lte: endOfDay(addDays(new Date(), 60)),
          },
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          blockType: true,
          reason: true,
        },
      }),
    ])

    const schedulesByDay = schedules.reduce(
      (acc, s) => {
        const day = s.dayOfWeek
        if (!acc[day]) acc[day] = []
        acc[day].push({ start: s.startTime, end: s.endTime, type: s.serviceType })
        return acc
      },
      {} as Record<number, { start: string; end: string; type: string }[]>
    )

    const scheduleSummary = [1, 2, 3, 4, 5, 6, 0]
      .filter((d) => schedulesByDay[d]?.length)
      .map((dayOfWeek) => ({
        dayOfWeek,
        dayLabel: DAY_LABELS[dayOfWeek],
        slots: schedulesByDay[dayOfWeek],
      }))

    const exceptionsSummary = exceptions.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      blockType: e.blockType,
      blockLabel: BLOCK_LABELS[e.blockType] || e.blockType,
      reason: e.reason,
    }))

    return NextResponse.json({
      schedules: scheduleSummary,
      exceptions: exceptionsSummary,
    })
  } catch (error) {
    console.error('[schedules/summary]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar resumo da agenda' },
      { status: 500 }
    )
  }
}
