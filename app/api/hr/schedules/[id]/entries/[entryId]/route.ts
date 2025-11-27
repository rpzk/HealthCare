import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// PATCH - Update entry (confirm, modify shift, etc)
export const PATCH = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const scheduleId = params?.id as string
    const entryId = params?.entryId as string
    const body = await req.json()
    const { shiftType, startTime, endTime, notes, isConfirmed } = body

    const entry = await prisma.scheduleEntry.findFirst({
      where: { id: entryId, scheduleId }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entrada não encontrada' }, { status: 404 })
    }

    const isManager = ['ADMIN', 'MANAGER'].includes(user.role)
    const isOwner = entry.userId === user.id

    // Only owner can confirm, managers can modify everything
    if (isConfirmed !== undefined && !isOwner && !isManager) {
      return NextResponse.json({ error: 'Apenas o próprio usuário pode confirmar' }, { status: 403 })
    }

    if ((shiftType || startTime || endTime || notes !== undefined) && !isManager) {
      return NextResponse.json({ error: 'Apenas gestores podem modificar turnos' }, { status: 403 })
    }

    const updateData: any = {}
    if (shiftType) updateData.shiftType = shiftType
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (notes !== undefined) updateData.notes = notes
    if (isConfirmed !== undefined) updateData.isConfirmed = isConfirmed

    const updated = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating entry:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar entrada', details: error.message },
      { status: 500 }
    )
  }
})

// DELETE - Remove entry
export const DELETE = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const scheduleId = params?.id as string
    const entryId = params?.entryId as string

    const entry = await prisma.scheduleEntry.findFirst({
      where: { id: entryId, scheduleId },
      include: { user: { select: { id: true, name: true } } }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entrada não encontrada' }, { status: 404 })
    }

    await prisma.scheduleEntry.delete({ where: { id: entryId } })

    // Notify user
    await prisma.notification.create({
      data: {
        userId: entry.userId,
        title: 'Escala Removida',
        message: `Sua escala do dia ${entry.date.toLocaleDateString('pt-BR')} foi removida`,
        type: 'WARNING'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting entry:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir entrada', details: error.message },
      { status: 500 }
    )
  }
})
