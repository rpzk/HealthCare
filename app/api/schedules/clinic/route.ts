/**
 * GET/POST /api/schedules/clinic
 * Horários de funcionamento da clínica (configuração global clinicId=null)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const schedules = await prisma.clinicSchedule.findMany({
      where: { clinicId: null },
      orderBy: { dayOfWeek: 'asc' },
    })

    const result = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const s = schedules.find((x) => x.dayOfWeek === dayOfWeek)
      return {
        dayOfWeek,
        label: DAY_LABELS[dayOfWeek],
        openTime: s?.openTime ?? '08:00',
        closeTime: s?.closeTime ?? '18:00',
        isOpen: s?.isOpen ?? (dayOfWeek >= 1 && dayOfWeek <= 5),
      }
    })

    return NextResponse.json({ schedules: result })
  } catch (error) {
    console.error('[schedules/clinic GET]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar horários' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as { role?: string })?.role
    if (role !== 'ADMIN' && role !== 'RECEPTIONIST') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { schedules } = body as {
      schedules?: Array<{
        dayOfWeek: number
        openTime?: string
        closeTime?: string
        isOpen?: boolean
      }>
    }

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json({ error: 'schedules inválido' }, { status: 400 })
    }

    for (const s of schedules) {
      const d = Number(s.dayOfWeek)
      if (d < 0 || d > 6) continue

      await prisma.clinicSchedule.upsert({
        where: {
          clinicId_dayOfWeek: { clinicId: (null as unknown as string), dayOfWeek: d },
        },
        create: {
          clinicId: null,
          dayOfWeek: d,
          openTime: s.openTime ?? '08:00',
          closeTime: s.closeTime ?? '18:00',
          isOpen: s.isOpen ?? true,
        },
        update: {
          openTime: s.openTime ?? '08:00',
          closeTime: s.closeTime ?? '18:00',
          isOpen: s.isOpen ?? true,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[schedules/clinic POST]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar horários' },
      { status: 500 }
    )
  }
}
