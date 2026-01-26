import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET /api/admin/users/search?search=...&limit=...
export async function GET(request: NextRequest) {
  try {
    await requireSession(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(Math.max(Number(limitRaw || 20), 1), 100)

    const where: any = { isActive: true }

    if (search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerUserId: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { name: 'asc' },
      take: limit
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    if (String(error?.message || '') === 'not_authenticated') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (String(error?.message || '') === 'forbidden') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    logger.error('Erro ao buscar usuários (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
