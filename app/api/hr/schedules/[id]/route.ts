import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Get schedule with entries
export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const id = params?.id as string

    const schedule = await prisma.workSchedule.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true }
        },
        entries: {
          include: {
            user: {
              select: { id: true, name: true, role: true, speciality: true }
            }
          },
          orderBy: [{ date: 'asc' }, { shiftType: 'asc' }]
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error: any) {
    logger.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar escala', details: error.message },
      { status: 500 }
    )
  }
})

// PATCH - Update schedule
export const PATCH = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const id = params?.id as string
    const body = await req.json()
    const { name, description, startDate, endDate, isActive } = body

    const existing = await prisma.workSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (isActive !== undefined) updateData.isActive = isActive

    const schedule = await prisma.workSchedule.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { entries: true } }
      }
    })

    return NextResponse.json(schedule)
  } catch (error: any) {
    logger.error('Error updating schedule:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar escala', details: error.message },
      { status: 500 }
    )
  }
})

// DELETE - Delete schedule
export const DELETE = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const id = params?.id as string

    const existing = await prisma.workSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 })
    }

    // Cascade delete will remove entries
    await prisma.workSchedule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir escala', details: error.message },
      { status: 500 }
    )
  }
})
