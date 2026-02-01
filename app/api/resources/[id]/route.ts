import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const UpdateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE']).optional(),
  capacity: z.number().optional(),
  floor: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  isBookable: z.boolean().optional(),
  bookingDuration: z.number().optional(),
})

// GET - Buscar recurso por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: {
            startTime: { gte: new Date() },
            status: 'CONFIRMED'
          },
          orderBy: { startTime: 'asc' },
          take: 10
        },
        maintenances: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          },
          orderBy: { scheduledDate: 'asc' },
          take: 5
        },
        _count: {
          select: { bookings: true, maintenances: true }
        }
      }
    })

    if (!resource) {
      return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    logger.error('Erro ao buscar recurso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar recurso
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = session.user.role
  if (!['ADMIN', 'OWNER'].includes(userRole as string)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validation = UpdateResourceSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Converter datas se necessário
    const updateData: any = { ...data }
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate)
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry)
    if (data.lastMaintenanceDate) updateData.lastMaintenanceDate = new Date(data.lastMaintenanceDate)
    if (data.nextMaintenanceDate) updateData.nextMaintenanceDate = new Date(data.nextMaintenanceDate)

    const resource = await prisma.resource.update({
      where: { id: params.id },
      data: updateData
    })

    logger.info('Recurso atualizado:', { id: resource.id, by: session.user.id })

    return NextResponse.json(resource)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
    }
    logger.error('Erro ao atualizar recurso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover recurso
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = session.user.role
  if (!['ADMIN', 'OWNER'].includes(userRole as string)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    // Verificar se há reservas futuras
    const futureBookings = await prisma.resourceBooking.count({
      where: {
        resourceId: params.id,
        startTime: { gte: new Date() },
        status: 'CONFIRMED'
      }
    })

    if (futureBookings > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir. Há ${futureBookings} reserva(s) futura(s).` },
        { status: 400 }
      )
    }

    await prisma.resource.delete({
      where: { id: params.id }
    })

    logger.info('Recurso excluído:', { id: params.id, by: session.user.id })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Recurso não encontrado' }, { status: 404 })
    }
    logger.error('Erro ao excluir recurso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
