import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - List work schedules
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const activeOnly = url.searchParams.get('active') !== 'false'
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const where: any = {}

    if (activeOnly) {
      where.isActive = true
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) }
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) }
    }

    const [schedules, total] = await Promise.all([
      prisma.workSchedule.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true }
          },
          _count: {
            select: { entries: true }
          }
        },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.workSchedule.count({ where })
    ])

    return NextResponse.json({
      data: schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    logger.error('Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar escalas', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Create new work schedule
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  // Only managers can create schedules
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description, startDate, endDate, entries } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Nome, data início e data fim são obrigatórios' },
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

    const schedule = await prisma.workSchedule.create({
      data: {
        name,
        description,
        startDate: start,
        endDate: end,
        createdBy: user.id,
        entries: entries?.length > 0 ? {
          create: entries.map((entry: any) => ({
            userId: entry.userId,
            date: new Date(entry.date),
            shiftType: entry.shiftType,
            startTime: entry.startTime,
            endTime: entry.endTime,
            notes: entry.notes
          }))
        } : undefined
      },
      include: {
        creator: {
          select: { id: true, name: true }
        },
        entries: {
          include: {
            user: {
              select: { id: true, name: true, role: true, speciality: true }
            }
          }
        }
      }
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating schedule:', error)
    return NextResponse.json(
      { error: 'Erro ao criar escala', details: error.message },
      { status: 500 }
    )
  }
})
