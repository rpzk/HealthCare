import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// GET - List inventory movements
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const productId = url.searchParams.get('productId')
    const locationId = url.searchParams.get('locationId')
    const type = url.searchParams.get('type')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const where: any = {}

    if (productId) where.productId = productId
    if (type) where.type = type
    
    if (locationId) {
      where.OR = [
        { fromLocationId: locationId },
        { toLocationId: locationId }
      ]
    }

    if (startDate) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) }
    }

    if (endDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) }
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, code: true, name: true, unit: true } },
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.inventoryMovement.count({ where })
    ])

    return NextResponse.json({
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching movements:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar movimentações', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Create inventory movement
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER', 'NURSE', 'DOCTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      productId, type, quantity, fromLocationId, toLocationId,
      lotNumber, expirationDate, referenceType, referenceId,
      unitCost, notes
    } = body

    if (!productId || !type || !quantity) {
      return NextResponse.json(
        { error: 'Produto, tipo e quantidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate product
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Validate locations based on movement type
    const entryTypes = ['ENTRY', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN']
    const exitTypes = ['EXIT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'LOSS', 'CONSUMPTION']

    if (entryTypes.includes(type) && !toLocationId) {
      return NextResponse.json({ error: 'Localização de destino obrigatória para entradas' }, { status: 400 })
    }

    if (exitTypes.includes(type) && !fromLocationId) {
      return NextResponse.json({ error: 'Localização de origem obrigatória para saídas' }, { status: 400 })
    }

    // For exits, check available stock
    if (exitTypes.includes(type)) {
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId,
          locationId: fromLocationId,
          ...(lotNumber ? { lotNumber } : {})
        }
      })

      const available = inventory ? inventory.quantity - inventory.reservedQty : 0
      if (quantity > available) {
        return NextResponse.json(
          { error: `Estoque insuficiente. Disponível: ${available}` },
          { status: 400 }
        )
      }
    }

    // Create movement in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create movement
      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          type,
          quantity,
          fromLocationId,
          toLocationId,
          lotNumber,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          referenceType,
          referenceId,
          unitCost,
          totalCost: unitCost ? unitCost * quantity : null,
          notes,
          userId: user.id
        }
      })

      // Update inventory for exit
      if (exitTypes.includes(type) && fromLocationId) {
        await tx.inventory.updateMany({
          where: {
            productId,
            locationId: fromLocationId,
            ...(lotNumber ? { lotNumber } : {})
          },
          data: {
            quantity: { decrement: quantity }
          }
        })
      }

      // Update inventory for entry
      if (entryTypes.includes(type) && toLocationId) {
        const existingInventory = await tx.inventory.findFirst({
          where: {
            productId,
            locationId: toLocationId,
            lotNumber: lotNumber || null
          }
        })

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: { increment: quantity } }
          })
        } else {
          await tx.inventory.create({
            data: {
              productId,
              locationId: toLocationId,
              quantity,
              lotNumber,
              expirationDate: expirationDate ? new Date(expirationDate) : null
            }
          })
        }
      }

      return movement
    })

    // Check for low stock alert
    const totalStock = await prisma.inventory.aggregate({
      where: { productId },
      _sum: { quantity: true }
    })

    if ((totalStock._sum.quantity || 0) <= product.minStock) {
      // Create notification for managers
      const managers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
        select: { id: true }
      })

      await prisma.notification.createMany({
        data: managers.map((m: any) => ({
          userId: m.id,
          title: 'Alerta de Estoque Baixo',
          message: `O produto ${product.name} (${product.code}) está com estoque abaixo do mínimo`,
          type: 'WARNING'
        }))
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error creating movement:', error)
    return NextResponse.json(
      { error: 'Erro ao criar movimentação', details: error.message },
      { status: 500 }
    )
  }
})
