import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

// POST - Add entry to schedule
export const POST = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const scheduleId = params?.id as string
    const body = await req.json()
    const { userId, date, shiftType, startTime, endTime, notes } = body

    if (!userId || !date || !shiftType) {
      return NextResponse.json(
        { error: 'Usuário, data e tipo de turno são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify schedule exists
    const schedule = await prisma.workSchedule.findUnique({ where: { id: scheduleId } })
    if (!schedule) {
      return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const entryDate = new Date(date)

    // Check if entry already exists
    const existing = await prisma.scheduleEntry.findUnique({
      where: {
        scheduleId_userId_date: {
          scheduleId,
          userId,
          date: entryDate
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma entrada para este usuário nesta data' },
        { status: 400 }
      )
    }

    // Check for leave requests on this date
    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['APPROVED', 'IN_PROGRESS'] },
        startDate: { lte: entryDate },
        endDate: { gte: entryDate }
      }
    })

    if (leaveRequest) {
      return NextResponse.json(
        { error: 'Usuário possui ausência aprovada para esta data' },
        { status: 400 }
      )
    }

    const entry = await prisma.scheduleEntry.create({
      data: {
        scheduleId,
        userId,
        date: entryDate,
        shiftType,
        startTime,
        endTime,
        notes
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, speciality: true }
        }
      }
    })

    // Notify user about schedule assignment
    await prisma.notification.create({
      data: {
        userId,
        title: 'Nova Escala Atribuída',
        message: `Você foi escalado para ${entryDate.toLocaleDateString('pt-BR')} - Turno: ${getShiftLabel(shiftType)}`,
        type: 'INFO'
      }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error: any) {
    console.error('Error adding schedule entry:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar entrada', details: error.message },
      { status: 500 }
    )
  }
})

// GET - List entries for schedule
export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const scheduleId = params?.id as string
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const where: any = { scheduleId }

    if (userId) {
      where.userId = userId
    }

    if (startDate) {
      where.date = { ...(where.date || {}), gte: new Date(startDate) }
    }

    if (endDate) {
      where.date = { ...(where.date || {}), lte: new Date(endDate) }
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, role: true, speciality: true }
        }
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }]
    })

    return NextResponse.json(entries)
  } catch (error: any) {
    console.error('Error fetching schedule entries:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar entradas', details: error.message },
      { status: 500 }
    )
  }
})

function getShiftLabel(shiftType: string): string {
  const labels: Record<string, string> = {
    MORNING: 'Manhã',
    AFTERNOON: 'Tarde',
    EVENING: 'Noite',
    NIGHT: 'Madrugada',
    FULL_DAY: 'Dia Inteiro',
    ON_CALL: 'Plantão',
    CUSTOM: 'Personalizado'
  }
  return labels[shiftType] || shiftType
}
