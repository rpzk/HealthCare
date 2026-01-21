import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

// GET - Get product by ID
export const GET = withAuth(async (req: NextRequest, { params }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const id = params?.id as string

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        inventory: {
          include: {
            location: { select: { id: true, name: true } }
          }
        },
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            fromLocation: { select: { name: true } },
            toLocation: { select: { name: true } }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Calculate stock from inventory items
    const totalStock = product.inventory.reduce((sum: number, i) => sum + (i.quantity || 0), 0)
    const availableStock = product.inventory.reduce((sum: number, i) => sum + ((i.quantity || 0) - (i.reservedQty || 0)), 0)

    return NextResponse.json({
      ...product,
      totalStock,
      availableStock,
      isLowStock: totalStock <= product.minStock
    })
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// PATCH - Update product
export const PATCH = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN', 'MANAGER', 'NURSE'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const id = params?.id as string
    const body = await req.json()

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Check for duplicate code/barcode if changing
    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.product.findUnique({ where: { code: body.code } })
      if (duplicate) {
        return NextResponse.json({ error: 'Código já existe' }, { status: 400 })
      }
    }

    if (body.barcode && body.barcode !== existing.barcode) {
      const duplicate = await prisma.product.findUnique({ where: { barcode: body.barcode } })
      if (duplicate) {
        return NextResponse.json({ error: 'Código de barras já existe' }, { status: 400 })
      }
    }

    const allowedFields = [
      'code', 'barcode', 'name', 'description', 'categoryId',
      'unit', 'minStock', 'maxStock', 'reorderPoint',
      'isActive', 'isControlled', 'requiresLot', 'costPrice', 'sellPrice'
    ]

    const updateData: Partial<Prisma.ProductUpdateInput> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as any)[field] = body[field]
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(product)
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar produto', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// DELETE - Delete product (soft delete by deactivating)
export const DELETE = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!['ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 })
  }

  try {
    const id = params?.id as string

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Check if has inventory
    const hasInventory = await prisma.inventory.findFirst({
      where: { productId: id, quantity: { gt: 0 } }
    })

    if (hasInventory) {
      // Soft delete
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ success: true, message: 'Produto desativado (possui estoque)' })
    }

    // Hard delete if no inventory
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir produto', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})
