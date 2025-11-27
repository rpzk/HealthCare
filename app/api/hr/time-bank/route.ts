import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// GET - Get time bank entries and balance
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // Non-managers can only see their own
    const targetUserId = ['ADMIN', 'MANAGER'].includes(user.role) && userId 
      ? userId 
      : user.id

    const where: any = { userId: targetUserId }

    if (startDate) {
      where.date = { ...(where.date || {}), gte: new Date(startDate) }
    }

    if (endDate) {
      where.date = { ...(where.date || {}), lte: new Date(endDate) }
    }

    const [entries, total, balanceResult] = await Promise.all([
      prisma.timeBank.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.timeBank.count({ where }),
      prisma.timeBank.aggregate({
        where: { userId: targetUserId },
        _sum: { minutes: true }
      })
    ])

    const balance = balanceResult._sum.minutes || 0
    const hours = Math.floor(Math.abs(balance) / 60)
    const mins = Math.abs(balance) % 60

    return NextResponse.json({
      data: entries,
      balance: {
        totalMinutes: balance,
        formatted: `${balance >= 0 ? '+' : '-'}${hours}h${mins.toString().padStart(2, '0')}m`,
        isPositive: balance >= 0
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching time bank:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar banco de horas', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Add time bank entry (managers only)
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, date, minutes, description, scheduleEntryId } = body

    if (!userId || minutes === undefined || !description) {
      return NextResponse.json(
        { error: 'userId, minutes e description são obrigatórios' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const entry = await prisma.timeBank.create({
      data: {
        userId,
        date: date ? new Date(date) : new Date(),
        minutes: parseInt(minutes),
        description,
        scheduleEntryId
      }
    })

    // Notify user
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    const isCredit = minutes > 0

    await prisma.notification.create({
      data: {
        userId,
        title: isCredit ? 'Crédito no Banco de Horas' : 'Débito no Banco de Horas',
        message: `${isCredit ? '+' : '-'}${hours}h${mins.toString().padStart(2, '0')}m: ${description}`,
        type: isCredit ? 'SUCCESS' : 'INFO'
      }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error: any) {
    console.error('Error adding time bank entry:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar entrada', details: error.message },
      { status: 500 }
    )
  }
})
