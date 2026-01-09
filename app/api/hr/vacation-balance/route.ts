import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

// GET - Get vacation balance for user
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    // Non-managers can only see their own balance
    const targetUserId = ['ADMIN', 'MANAGER'].includes(user.role) && userId 
      ? userId 
      : user.id

    let balance = await prisma.vacationBalance.findUnique({
      where: { userId: targetUserId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Create default balance if not exists
    if (!balance) {
      const currentYear = new Date().getFullYear()
      balance = await prisma.vacationBalance.create({
        data: {
          userId: targetUserId,
          totalDays: 30,
          usedDays: 0,
          pendingDays: 0,
          referenceYear: currentYear,
          expiresAt: new Date(currentYear + 2, 11, 31) // 2 years to use
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    }

    const available = balance.totalDays - balance.usedDays - balance.pendingDays

    return NextResponse.json({
      ...balance,
      availableDays: available
    })
  } catch (error: any) {
    console.error('Error fetching vacation balance:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saldo de férias', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Create or reset vacation balance (admin only)
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, totalDays, referenceYear, expiresAt } = body

    if (!userId || !referenceYear) {
      return NextResponse.json(
        { error: 'userId e referenceYear são obrigatórios' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const balance = await prisma.vacationBalance.upsert({
      where: { userId },
      update: {
        totalDays: totalDays || 30,
        usedDays: 0,
        pendingDays: 0,
        referenceYear,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(referenceYear + 2, 11, 31)
      },
      create: {
        userId,
        totalDays: totalDays || 30,
        referenceYear,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(referenceYear + 2, 11, 31)
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(balance)
  } catch (error: any) {
    console.error('Error creating vacation balance:', error)
    return NextResponse.json(
      { error: 'Erro ao criar saldo de férias', details: error.message },
      { status: 500 }
    )
  }
})
