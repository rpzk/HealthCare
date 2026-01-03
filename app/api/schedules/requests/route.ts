import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ADMIN_ROLES = ['ADMIN', 'RECEPTIONIST']

const scheduleRequestSchema = z.object({
  requestType: z.enum(['ADD_HOURS', 'REMOVE_HOURS', 'MODIFY_HOURS', 'BLOCK_DATES', 'UNBLOCK_DATES', 'CHANGE_SERVICE_TYPE']),
  requestData: z.any(), // JSON flexível
  reason: z.string().optional(),
})

// GET - Listar solicitações (Admin vê todas, profissional vê suas)
export async function GET(request: NextRequest) {
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
    const status = searchParams.get('status')
    const isAdmin = ADMIN_ROLES.includes(user.role)

    const where: any = {}
    if (!isAdmin) {
      where.professionalId = user.id
    }
    if (status) {
      where.status = status
    }

    const requests = await prisma.scheduleChangeRequest.findMany({
      where,
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching schedule requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST - Criar nova solicitação
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
    const { requestType, requestData, reason } = scheduleRequestSchema.parse(body)

    const changeRequest = await prisma.scheduleChangeRequest.create({
      data: {
        professionalId: user.id,
        requestedBy: user.id,
        requestType,
        requestData,
        reason,
        status: 'PENDING',
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // TODO: Enviar notificação para admin/secretária

    return NextResponse.json({
      success: true,
      message: 'Solicitação enviada para aprovação',
      request: changeRequest,
    })
  } catch (error) {
    console.error('Error creating schedule request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

// PATCH - Aprovar/Rejeitar solicitação (apenas Admin/Secretária)
export async function PATCH(request: NextRequest) {
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
        { error: 'Apenas administradores e secretárias podem aprovar solicitações' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { requestId, action, reviewNotes } = z.object({
      requestId: z.string(),
      action: z.enum(['APPROVED', 'REJECTED']),
      reviewNotes: z.string().optional(),
    }).parse(body)

    const changeRequest = await prisma.scheduleChangeRequest.findUnique({
      where: { id: requestId },
    })

    if (!changeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (changeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already reviewed' }, { status: 400 })
    }

    // Atualizar solicitação
    const updated = await prisma.scheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes,
      },
    })

    // Se aprovado, executar a ação
    if (action === 'APPROVED') {
      await executeScheduleChange(changeRequest)
    }

    // TODO: Enviar notificação para o solicitante

    return NextResponse.json({
      success: true,
      message: action === 'APPROVED' ? 'Solicitação aprovada' : 'Solicitação rejeitada',
      request: updated,
    })
  } catch (error) {
    console.error('Error reviewing schedule request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to review request' }, { status: 500 })
  }
}

// Executar mudança de agenda aprovada
async function executeScheduleChange(request: any) {
  const { requestType, requestData, professionalId } = request

  switch (requestType) {
    case 'ADD_HOURS':
      // requestData: { dayOfWeek, startTime, endTime, serviceType }
      await prisma.professionalSchedule.create({
        data: {
          professionalId,
          requestedBy: professionalId,
          approvedBy: request.reviewedBy,
          approvedAt: new Date(),
          status: 'APPROVED',
          ...requestData,
        },
      })
      break

    case 'REMOVE_HOURS':
      // requestData: { scheduleId }
      await prisma.professionalSchedule.delete({
        where: { id: requestData.scheduleId },
      })
      break

    case 'BLOCK_DATES':
      // requestData: { dates, blockType, reason, startTime?, endTime? }
      const { dates, blockType, reason, startTime, endTime } = requestData
      
      for (const dateStr of dates) {
        const date = new Date(dateStr)
        
        // Se tem horário específico, usa; senão bloqueia o dia todo
        const startDate = startTime ? new Date(`${dateStr}T${startTime}`) : date
        const endDate = endTime ? new Date(`${dateStr}T${endTime}`) : date
        
        await prisma.scheduleException.create({
          data: {
            doctorId: professionalId,
            date: startDate,
            blockType: blockType || 'ON_CALL',
            reason,
          },
        })
      }
      break

    // Outros tipos...
  }
}
