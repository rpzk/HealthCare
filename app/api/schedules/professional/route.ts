import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ADMIN_ROLES = ['ADMIN', 'RECEPTIONIST']

// GET - Listar horários de um profissional
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetId = professionalId || user.id
    const isAdmin = ADMIN_ROLES.includes(user.role)

    // Apenas admin pode ver horários de outros profissionais
    if (targetId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const schedules = await prisma.professionalSchedule.findMany({
      where: {
        professionalId: targetId,
        status: 'APPROVED',
        isActive: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Error fetching professional schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

// POST - Criar horário (gera solicitação se não for admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const scheduleData = z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      serviceType: z.enum(['IN_PERSON', 'REMOTE', 'BOTH']).default('BOTH'),
      reason: z.string().optional(),
    }).parse(body)

    const isAdmin = ADMIN_ROLES.includes(user.role)

    if (isAdmin) {
      // Admin pode criar diretamente
      const schedule = await prisma.professionalSchedule.create({
        data: {
          professionalId: user.id,
          requestedBy: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
          status: 'APPROVED',
          dayOfWeek: scheduleData.dayOfWeek,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          serviceType: scheduleData.serviceType,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Horário criado com sucesso',
        schedule,
      })
    } else {
      // Profissional cria solicitação
      const changeRequest = await prisma.scheduleChangeRequest.create({
        data: {
          professionalId: user.id,
          requestedBy: user.id,
          requestType: 'ADD_HOURS',
          requestData: scheduleData,
          reason: scheduleData.reason,
          status: 'PENDING',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Solicitação enviada para aprovação do administrador',
        request: changeRequest,
        requiresApproval: true,
      })
    }
  } catch (error) {
    console.error('Error creating schedule:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

// DELETE - Remover horário
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('id')
    const reason = searchParams.get('reason')

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const schedule = await prisma.professionalSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const isAdmin = ADMIN_ROLES.includes(user.role)

    if (isAdmin) {
      // Admin pode remover diretamente
      await prisma.professionalSchedule.delete({
        where: { id: scheduleId },
      })

      return NextResponse.json({
        success: true,
        message: 'Horário removido com sucesso',
      })
    } else {
      // Profissional cria solicitação de remoção
      const changeRequest = await prisma.scheduleChangeRequest.create({
        data: {
          professionalId: user.id,
          requestedBy: user.id,
          requestType: 'REMOVE_HOURS',
          requestData: { scheduleId },
          reason,
          status: 'PENDING',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Solicitação de remoção enviada para aprovação',
        request: changeRequest,
        requiresApproval: true,
      })
    }
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
