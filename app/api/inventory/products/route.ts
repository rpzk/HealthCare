import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

// GET - List products
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const categoryId = url.searchParams.get('categoryId')
    const active = url.searchParams.get('active')
    const lowStock = url.searchParams.get('lowStock') === 'true'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const where: Prisma.ProductWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } }
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (active !== null && active !== undefined) {
      where.isActive = active === 'true'
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          inventory: {
            select: {
              quantity: true,
              reservedQty: true,
              location: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    // Calculate total stock and check low stock
    const productsWithStock = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, i) => sum + i.quantity, 0)
      const availableStock = p.inventory.reduce((sum, i) => sum + (i.quantity - i.reservedQty), 0)
      const isLowStock = totalStock <= p.minStock
      
      return {
        ...p,
        totalStock,
        availableStock,
        isLowStock
      }
    })

    // Filter by low stock if requested
    const finalProducts = lowStock 
      ? productsWithStock.filter((p: any) => p.isLowStock)
      : productsWithStock

    return NextResponse.json({
      data: finalProducts,
      pagination: {
        page,
        limit,
        total: lowStock ? finalProducts.length : total,
        totalPages: Math.ceil((lowStock ? finalProducts.length : total) / limit)
      }
    })
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// POST - Create product
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER', 'NURSE'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      code, barcode, name, description, categoryId,
      unit, minStock, maxStock, reorderPoint,
      isControlled, requiresLot, costPrice, sellPrice
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Código e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Check for duplicate code or barcode
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { code },
          barcode ? { barcode } : {}
        ].filter(c => Object.keys(c).length > 0)
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Código ou código de barras já existe' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        code,
        barcode,
        name,
        description,
        categoryId,
        unit: unit || 'UNIT',
        minStock: minStock || 0,
        maxStock,
        reorderPoint,
        isControlled: isControlled || false,
        requiresLot: requiresLot || false,
        costPrice,
        sellPrice
      },
      include: {
        category: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Erro ao criar produto', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})
