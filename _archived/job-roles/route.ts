import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET /api/job-roles - List job roles (staff only)
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSession()
    if (actor.role === 'PATIENT') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(Math.max(Number(limitRaw || 50), 1), 200)

    const where: any = { active: true }

    if (search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const roles = await prisma.jobRole.findMany({
      where,
      select: {
        id: true,
        title: true,
        requiredMinStratum: true,
        requiredMaxStratum: true,
        active: true,
        occupation: { select: { id: true, title: true } },
        stratumProfile: {
          select: {
            minStratum: true,
            optimalStratum: true,
            maxStratum: true,
            timeSpanMinMonths: true,
            timeSpanMaxMonths: true
          }
        }
      },
      orderBy: { title: 'asc' },
      take: limit
    })

    return NextResponse.json({ roles })
  } catch (error) {
    logger.error('Erro ao listar job roles:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
