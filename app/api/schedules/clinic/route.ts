import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const ADMIN_ROLES = ['ADMIN', 'RECEPTIONIST']

const clinicScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0=Dom, 6=Sáb
  openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM
  closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isOpen: z.boolean(),
})

// GET - Listar horários da clínica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schedules = await prisma.clinicSchedule.findMany({
      where: { clinicId: null }, // Global schedule
      orderBy: { dayOfWeek: 'asc' },
    })

    // Se não houver horários, retorna padrão
    if (schedules.length === 0) {
      const defaultSchedules = [
        { dayOfWeek: 0, openTime: '08:00', closeTime: '12:00', isOpen: false, label: 'Domingo' },
        { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true, label: 'Segunda' },
        { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true, label: 'Terça' },
        { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true, label: 'Quarta' },
        { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true, label: 'Quinta' },
        { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true, label: 'Sexta' },
        { dayOfWeek: 6, openTime: '08:00', closeTime: '12:00', isOpen: false, label: 'Sábado' },
      ]
      
      return NextResponse.json({ schedules: defaultSchedules, isDefault: true })
    }

    return NextResponse.json({ schedules, isDefault: false })
  } catch (error) {
    logger.error('Error fetching clinic schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch clinic schedules' }, { status: 500 })
  }
}

// POST - Criar/Atualizar horários da clínica (apenas Admin/Secretária)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e secretárias podem configurar horários da clínica' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { schedules } = z.object({
      schedules: z.array(clinicScheduleSchema),
    }).parse(body)

    // Atualizar ou criar horários (configuração padrão global: clinicId = null)
    const results = await Promise.all(
      schedules.map(async (schedule) => {
        const existing = await prisma.clinicSchedule.findFirst({
          where: {
            clinicId: null,
            dayOfWeek: schedule.dayOfWeek,
          },
        })

        if (existing) {
          return prisma.clinicSchedule.update({
            where: { id: existing.id },
            data: {
              openTime: schedule.openTime,
              closeTime: schedule.closeTime,
              isOpen: schedule.isOpen,
            },
          })
        }

        return prisma.clinicSchedule.create({
          data: {
            clinicId: null,
            dayOfWeek: schedule.dayOfWeek,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
            isOpen: schedule.isOpen,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: 'Horários da clínica atualizados com sucesso',
      schedules: results,
    })
  } catch (error) {
    logger.error('Error updating clinic schedules:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update clinic schedules' }, { status: 500 })
  }
}
