/**
 * API Admin de Oposições ao Tratamento
 * 
 * Gerencia solicitações de oposição dos pacientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateOppositionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PARTIAL']),
  analysisNotes: z.string().optional(),
  legalBasis: z.string().optional(),
  rejectionReason: z.string().optional(),
  effectsApplied: z.record(z.boolean()).optional()
})

// GET - Listar todas as oposições (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [oppositions, total] = await Promise.all([
      prisma.treatmentOpposition.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.treatmentOpposition.count({ where })
    ])

    // Stats
    const stats = await prisma.treatmentOpposition.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    return NextResponse.json({
      oppositions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {})
    })
  } catch (error) {
    console.error('[AdminOppositions] GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
