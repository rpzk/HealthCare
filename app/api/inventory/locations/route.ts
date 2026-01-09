import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

import type { Prisma } from '@prisma/client'

// GET - List storage locations
export const GET = withAuth(async (req: NextRequest) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const active = url.searchParams.get('active')

    const where: Prisma.StorageLocationWhereInput = {}
    if (active !== null) {
      where.isActive = active === 'true'
    }

    const locations = await prisma.storageLocation.findMany({
      where,
      include: {
        _count: {
          select: { inventory: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(locations)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar localizações', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// POST - Create storage location
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const location = await prisma.storageLocation.create({
      data: { name, description }
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error: unknown) {
    // Prisma unique constraint error P2002
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2002') {
      return NextResponse.json({ error: 'Nome já existe' }, { status: 400 })
    }

    if (error instanceof Error) console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Erro ao criar localização', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})
