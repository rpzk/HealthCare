import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// GET - Inventory Dashboard
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      expiringProducts,
      totalLocations,
      movementsThisMonth,
      movementsByType,
      recentMovements
    ] = await Promise.all([
      // Total products
      prisma.product.count(),
      
      // Active products
      prisma.product.count({ where: { isActive: true } }),
      
      // Products with low stock
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT p.id)::int as count
        FROM products p
        LEFT JOIN inventory i ON p.id = i."productId"
        GROUP BY p.id, p."minStock"
        HAVING COALESCE(SUM(i.quantity), 0) <= p."minStock"
      `.then((r: any) => r.length),
      
      // Products expiring within 30 days
      prisma.inventory.count({
        where: {
          expirationDate: {
            gte: today,
            lte: thirtyDaysFromNow
          },
          quantity: { gt: 0 }
        }
      }),
      
      // Total locations
      prisma.storageLocation.count({ where: { isActive: true } }),
      
      // Movements this month
      prisma.inventoryMovement.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      
      // Movements by type this month
      prisma.inventoryMovement.groupBy({
        by: ['type'],
        where: { createdAt: { gte: startOfMonth } },
        _count: { type: true },
        _sum: { quantity: true }
      }),
      
      // Recent movements
      prisma.inventoryMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { code: true, name: true } },
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } }
        }
      })
    ])

    // Get low stock items
    const lowStockItems = await prisma.$queryRaw`
      SELECT p.id, p.code, p.name, p.unit, p."minStock",
             COALESCE(SUM(i.quantity), 0)::int as "currentStock"
      FROM products p
      LEFT JOIN inventory i ON p.id = i."productId"
      WHERE p."isActive" = true
      GROUP BY p.id, p.code, p.name, p.unit, p."minStock"
      HAVING COALESCE(SUM(i.quantity), 0) <= p."minStock"
      LIMIT 10
    `

    // Get expiring items
    const expiringItems = await prisma.inventory.findMany({
      where: {
        expirationDate: {
          gte: today,
          lte: thirtyDaysFromNow
        },
        quantity: { gt: 0 }
      },
      include: {
        product: { select: { code: true, name: true } },
        location: { select: { name: true } }
      },
      orderBy: { expirationDate: 'asc' },
      take: 10
    })

    // Format movement types
    const typeLabels: Record<string, string> = {
      ENTRY: 'Entrada',
      EXIT: 'Saída',
      ADJUSTMENT_IN: 'Ajuste +',
      ADJUSTMENT_OUT: 'Ajuste -',
      TRANSFER_IN: 'Transf. Entrada',
      TRANSFER_OUT: 'Transf. Saída',
      LOSS: 'Perda',
      RETURN: 'Devolução',
      CONSUMPTION: 'Consumo'
    }

    return NextResponse.json({
      summary: {
        totalProducts,
        activeProducts,
        lowStockCount: lowStockProducts,
        expiringCount: expiringProducts,
        totalLocations,
        movementsThisMonth
      },
      movementsByType: movementsByType.map((m: any) => ({
        type: m.type,
        label: typeLabels[m.type] || m.type,
        count: m._count.type,
        totalQuantity: m._sum.quantity
      })),
      lowStockItems,
      expiringItems,
      recentMovements: recentMovements.map((m: any) => ({
        ...m,
        typeLabel: typeLabels[m.type] || m.type
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching inventory dashboard:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dashboard', details: error.message },
      { status: 500 }
    )
  }
})
