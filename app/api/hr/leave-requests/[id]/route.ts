import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Get specific leave request
export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const id = params?.id as string

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, speciality: true }
        },
        approver: {
          select: { id: true, name: true }
        }
      }
    })

    if (!request) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // Non-managers can only see their own
    const canView = ['ADMIN', 'MANAGER'].includes(user.role) || request.userId === user.id
    if (!canView) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(request)
  } catch (error: any) {
    logger.error('Error fetching leave request:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar solicitação', details: error.message },
      { status: 500 }
    )
  }
})

// PATCH - Update leave request (approve, reject, cancel)
export const PATCH = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const id = params?.id as string
    const body = await req.json()
    const { action, rejectionNote } = body

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } }
    })

    if (!request) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    const isManager = ['ADMIN', 'MANAGER'].includes(user.role)
    const isOwner = request.userId === user.id

    // Validate action permissions
    if (action === 'approve' || action === 'reject') {
      if (!isManager) {
        return NextResponse.json({ error: 'Apenas gestores podem aprovar/rejeitar' }, { status: 403 })
      }
      if (request.status !== 'PENDING') {
        return NextResponse.json({ error: 'Apenas solicitações pendentes podem ser processadas' }, { status: 400 })
      }
    } else if (action === 'cancel') {
      if (!isOwner && !isManager) {
        return NextResponse.json({ error: 'Sem permissão para cancelar' }, { status: 403 })
      }
      if (!['PENDING', 'APPROVED'].includes(request.status)) {
        return NextResponse.json({ error: 'Esta solicitação não pode ser cancelada' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Ação inválida. Use: approve, reject ou cancel' }, { status: 400 })
    }

    // Calculate days for vacation balance update
    const days = Math.ceil(
      (request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    let updateData: any = {}
    let notificationMessage = ''

    switch (action) {
      case 'approve':
        updateData = {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date()
        }
        notificationMessage = `Sua solicitação de ausência foi aprovada por ${user.name}`

        // Update vacation balance if vacation
        if (request.type === 'VACATION') {
          await prisma.vacationBalance.updateMany({
            where: { userId: request.userId },
            data: {
              pendingDays: { decrement: days },
              usedDays: { increment: days }
            }
          })
        }
        break

      case 'reject':
        updateData = {
          status: 'REJECTED',
          approvedBy: user.id,
          approvedAt: new Date(),
          rejectionNote: rejectionNote || null
        }
        notificationMessage = `Sua solicitação de ausência foi rejeitada${rejectionNote ? `: ${rejectionNote}` : ''}`

        // Restore pending days if vacation
        if (request.type === 'VACATION') {
          await prisma.vacationBalance.updateMany({
            where: { userId: request.userId },
            data: { pendingDays: { decrement: days } }
          })
        }
        break

      case 'cancel':
        updateData = { status: 'CANCELLED' }
        notificationMessage = isOwner
          ? `Você cancelou sua solicitação de ausência`
          : `Sua solicitação de ausência foi cancelada por ${user.name}`

        // Restore days based on previous status
        if (request.type === 'VACATION') {
          if (request.status === 'PENDING') {
            await prisma.vacationBalance.updateMany({
              where: { userId: request.userId },
              data: { pendingDays: { decrement: days } }
            })
          } else if (request.status === 'APPROVED') {
            await prisma.vacationBalance.updateMany({
              where: { userId: request.userId },
              data: { usedDays: { decrement: days } }
            })
          }
        }
        break
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true }
        }
      }
    })

    // Send notification to request owner
    if (notificationMessage && request.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: 'Atualização de Solicitação',
          message: notificationMessage,
          type: action === 'approve' ? 'SUCCESS' : action === 'reject' ? 'WARNING' : 'INFO'
        }
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    logger.error('Error updating leave request:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar solicitação', details: error.message },
      { status: 500 }
    )
  }
})

// DELETE - Delete leave request (only pending and by owner or admin)
export const DELETE = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const id = params?.id as string

    const request = await prisma.leaveRequest.findUnique({
      where: { id }
    })

    if (!request) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    const isAdmin = user.role === 'ADMIN'
    const isOwner = request.userId === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 })
    }

    if (request.status !== 'PENDING' && !isAdmin) {
      return NextResponse.json({ error: 'Apenas solicitações pendentes podem ser excluídas' }, { status: 400 })
    }

    // Restore vacation balance if applicable
    if (request.type === 'VACATION' && request.status === 'PENDING') {
      const days = Math.ceil(
        (request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
      
      await prisma.vacationBalance.updateMany({
        where: { userId: request.userId },
        data: { pendingDays: { decrement: days } }
      })
    }

    await prisma.leaveRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error deleting leave request:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir solicitação', details: error.message },
      { status: 500 }
    )
  }
})
