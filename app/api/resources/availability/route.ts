import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const runtime = 'nodejs'

const availabilityQuerySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.enum(['ROOM', 'EQUIPMENT']).optional(),
  category: z.string().optional(),
})

/**
 * GET /api/resources/availability
 * Busca recursos disponíveis para um período específico
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const queryResult = availabilityQuerySchema.safeParse({
      startTime: searchParams.get('startTime'),
      endTime: searchParams.get('endTime'),
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { startTime, endTime, type, category } = queryResult.data
    const start = new Date(startTime)
    const end = new Date(endTime)

    // Buscar todos os recursos que podem ser reservados
    const resources = await prisma.resource.findMany({
      where: {
        status: 'AVAILABLE',
        isBookable: true,
        ...(type && { type }),
        ...(category && { category }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        location: true,
        capacity: true,
        floor: true,
        model: true,
        bookingDuration: true,
      }
    })

    // Buscar reservas que conflitam com o período solicitado
    const conflictingBookings = await prisma.resourceBooking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          {
            startTime: { lte: start },
            endTime: { gt: start }
          },
          {
            startTime: { lt: end },
            endTime: { gte: end }
          },
          {
            startTime: { gte: start },
            endTime: { lte: end }
          }
        ]
      },
      select: {
        resourceId: true,
      }
    })

    const busyResourceIds = new Set(conflictingBookings.map(b => b.resourceId))

    // Marcar disponibilidade de cada recurso
    const availableResources = resources.map(resource => ({
      ...resource,
      isAvailable: !busyResourceIds.has(resource.id)
    }))

    // Separar por disponibilidade para facilitar uso no frontend
    const available = availableResources.filter(r => r.isAvailable)
    const busy = availableResources.filter(r => !r.isAvailable)

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString() },
      available,
      busy,
      summary: {
        totalResources: resources.length,
        availableCount: available.length,
        busyCount: busy.length,
      }
    })
  } catch (error) {
    logger.error('Erro ao buscar disponibilidade de recursos', error as Error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
