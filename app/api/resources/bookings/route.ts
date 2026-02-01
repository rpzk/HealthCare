import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const BookingSchema = z.object({
  resourceId: z.string(),
  patientId: z.string().optional(),
  consultationId: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
})

// GET - Listar reservas
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const resourceId = url.searchParams.get('resourceId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const status = url.searchParams.get('status')

    const where: any = {}

    if (resourceId) where.resourceId = resourceId
    if (status) where.status = status
    
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate)
      if (endDate) where.startTime.lte = new Date(endDate)
    }

    const bookings = await prisma.resourceBooking.findMany({
      where,
      include: {
        resource: {
          select: { id: true, name: true, type: true, category: true, location: true }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    return NextResponse.json({ data: bookings })
  } catch (error) {
    logger.error('Erro ao listar reservas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar reserva
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = BookingSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Verificar se recurso existe e está disponível
    const resource = await prisma.resource.findUnique({
      where: { id: data.resourceId }
    })

    if (!resource) {
      return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
    }

    if (!resource.isBookable) {
      return NextResponse.json({ error: 'Este recurso não pode ser reservado' }, { status: 400 })
    }

    if (resource.status === 'INACTIVE' || resource.status === 'MAINTENANCE') {
      return NextResponse.json(
        { error: `Recurso ${resource.status === 'INACTIVE' ? 'inativo' : 'em manutenção'}` },
        { status: 400 }
      )
    }

    // Verificar conflitos de horário
    const conflict = await prisma.resourceBooking.findFirst({
      where: {
        resourceId: data.resourceId,
        status: 'CONFIRMED',
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime }
          }
        ]
      }
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Conflito de horário. O recurso já está reservado neste período.' },
        { status: 400 }
      )
    }

    const booking = await prisma.resourceBooking.create({
      data: {
        resourceId: data.resourceId,
        userId: session.user.id,
        patientId: data.patientId,
        consultationId: data.consultationId,
        startTime,
        endTime,
        notes: data.notes,
        status: 'CONFIRMED'
      },
      include: {
        resource: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    logger.info('Reserva criada:', { 
      id: booking.id, 
      resource: resource.name, 
      by: session.user.id 
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    logger.error('Erro ao criar reserva:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
