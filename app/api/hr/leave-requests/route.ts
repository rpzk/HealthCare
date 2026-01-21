import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - List leave requests (own or all for managers)
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    // Only ADMIN can see all requests
    const canViewAll = ['ADMIN'].includes(user.role)
    
    const where: any = {}
    
    // Filter by user - non-managers can only see their own
    if (userId && canViewAll) {
      where.userId = userId
    } else if (!canViewAll) {
      where.userId = user.id
    }
    
    if (status) {
      where.status = status
    }
    
    if (startDate) {
      where.startDate = { gte: new Date(startDate) }
    }
    
    if (endDate) {
      where.endDate = { lte: new Date(endDate) }
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, speciality: true }
          },
          approver: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leaveRequest.count({ where })
    ])

    return NextResponse.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    logger.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar solicitações', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Create new leave request
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const body = await req.json()
    const { type, startDate, endDate, reason } = body

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Tipo, data início e data fim são obrigatórios' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      )
    }

    // Check for overlapping requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação para este período' },
        { status: 400 }
      )
    }

    // Calculate days
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // For vacation, check balance
    if (type === 'VACATION') {
      const balance = await prisma.vacationBalance.findUnique({
        where: { userId: user.id }
      })

      if (balance) {
        const available = balance.totalDays - balance.usedDays - balance.pendingDays
        if (days > available) {
          return NextResponse.json(
            { error: `Saldo de férias insuficiente. Disponível: ${available} dias` },
            { status: 400 }
          )
        }

        // Update pending days
        await prisma.vacationBalance.update({
          where: { userId: user.id },
          data: { pendingDays: { increment: days } }
        })
      }
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        type,
        startDate: start,
        endDate: end,
        reason
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Create notification for managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN'] }, isActive: true },
      select: { id: true }
    })

    const typeLabels: Record<string, string> = {
      VACATION: 'Férias',
      SICK_LEAVE: 'Licença Médica',
      MATERNITY: 'Licença Maternidade',
      PATERNITY: 'Licença Paternidade',
      BEREAVEMENT: 'Luto',
      PERSONAL: 'Particular',
      TRAINING: 'Treinamento',
      COMPENSATORY: 'Folga Compensatória',
      OTHER: 'Outro'
    }

    await prisma.notification.createMany({
      data: managers.map((m: { id: string }) => ({
        userId: m.id,
        title: 'Nova Solicitação de Ausência',
        message: `${user.name} solicitou ${typeLabels[type] || type} de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`,
        type: 'INFO'
      }))
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating leave request:', error)
    return NextResponse.json(
      { error: 'Erro ao criar solicitação', details: error.message },
      { status: 500 }
    )
  }
})
