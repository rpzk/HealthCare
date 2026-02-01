import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema de validação
const ResourceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['ROOM', 'EQUIPMENT']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  location: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE']).default('AVAILABLE'),
  capacity: z.number().optional(),
  floor: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  isBookable: z.boolean().default(true),
  bookingDuration: z.number().optional(),
})

// GET - Listar recursos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // ROOM ou EQUIPMENT
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const where: any = {}

    if (type) where.type = type
    if (status) where.status = status
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { bookings: true, maintenances: true }
          }
        }
      }),
      prisma.resource.count({ where })
    ])

    return NextResponse.json({
      data: resources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Erro ao listar recursos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar recurso
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Apenas ADMIN pode criar recursos
  const userRole = session.user.role
  if (!['ADMIN', 'OWNER'].includes(userRole as string)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validation = ResourceSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        category: data.category,
        location: data.location,
        status: data.status,
        capacity: data.capacity,
        floor: data.floor,
        model: data.model,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        isBookable: data.isBookable,
        bookingDuration: data.bookingDuration,
        createdBy: session.user.id,
      }
    })

    logger.info('Recurso criado:', { id: resource.id, name: resource.name, by: session.user.id })

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    logger.error('Erro ao criar recurso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
