/**
 * GET /api/schedules/my-schedules
 * Retorna horários do profissional (ProfessionalSchedule aprovados) + configuração de agendamento
 *
 * PUT /api/schedules/my-schedules
 * Atualiza configuração de agendamento por paciente (allowPatientBooking, etc.)
 * Nota: ProfessionalSchedule é alterado via solicitação. Aqui salvamos apenas a config de booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

const DEFAULT_BOOKING = {
  allowPatientBooking: false,
  maxBookingDaysAhead: 30,
  minBookingHoursAhead: 24,
  autoConfirmBooking: false,
}

function getBookingKey(userId: string) {
  return `schedule_booking_${userId}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string

    const schedules = await prisma.professionalSchedule.findMany({
      where: {
        professionalId: userId,
        status: 'APPROVED',
        isActive: true,
      },
      orderBy: { dayOfWeek: 'asc' },
    })

    const settingsRow = await prisma.systemSetting.findUnique({
      where: { key: getBookingKey(userId) },
    })
    let settings: { value?: Record<string, unknown> } | null = null
    if (settingsRow?.value) {
      try {
        settings = { value: JSON.parse(settingsRow.value) as Record<string, unknown> }
      } catch {
        // ignore
      }
    }

    const bookingByDay: Record<number, typeof DEFAULT_BOOKING> = {}
    for (const d of DAYS) {
      let booking = DEFAULT_BOOKING
      if (settings?.value && typeof settings.value === 'object' && String(d) in (settings.value as object)) {
        const dayConfig = (settings.value as Record<string, unknown>)[String(d)]
        if (dayConfig && typeof dayConfig === 'object') {
          const c = dayConfig as Record<string, unknown>
          booking = {
            allowPatientBooking: !!c.allowPatientBooking,
            maxBookingDaysAhead: (c.maxBookingDaysAhead as number) ?? 30,
            minBookingHoursAhead: (c.minBookingHoursAhead as number) ?? 24,
            autoConfirmBooking: !!c.autoConfirmBooking,
          }
        }
      }
      bookingByDay[d] = booking
    }

    const result = schedules.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      ...bookingByDay[s.dayOfWeek],
    }))

    return NextResponse.json({ schedules: result })
  } catch (error) {
    console.error('[schedules/my-schedules GET]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar horários' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string
    const body = await request.json()
    const { schedules } = body as {
      schedules?: Array<{
        dayOfWeek: number
        allowPatientBooking?: boolean
        maxBookingDaysAhead?: number
        minBookingHoursAhead?: number
        autoConfirmBooking?: boolean
      }>
    }

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json({ error: 'schedules inválido' }, { status: 400 })
    }

    const value: Record<string, unknown> = {}
    for (const s of schedules) {
      const d = Number(s.dayOfWeek)
      if (d >= 0 && d <= 6) {
        value[String(d)] = {
          allowPatientBooking: !!s.allowPatientBooking,
          maxBookingDaysAhead: s.maxBookingDaysAhead ?? 30,
          minBookingHoursAhead: s.minBookingHoursAhead ?? 24,
          autoConfirmBooking: !!s.autoConfirmBooking,
        }
      }
    }

    await prisma.systemSetting.upsert({
      where: { key: getBookingKey(userId) },
      create: { key: getBookingKey(userId), value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[schedules/my-schedules PUT]', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}
