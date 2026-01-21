import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Check for low stock items and create alerts
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Get all products with inventory levels
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        inventory: {
          select: {
            quantity: true,
            location: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Calculate total stock per product and filter low stock
    const lowStockItems = products
      .map((product: any) => {
        const totalStock = product.inventory.reduce((sum: number, inv: any) => sum + inv.quantity, 0)
        const minLevel = product.minStock || 10
        
        if (totalStock > minLevel) return null

        const percentage = minLevel > 0 ? (totalStock / minLevel) * 100 : 0
        
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        if (totalStock === 0) {
          severity = 'CRITICAL'
        } else if (percentage <= 25) {
          severity = 'HIGH'
        } else if (percentage <= 50) {
          severity = 'MEDIUM'
        } else {
          severity = 'LOW'
        }

        return {
          productId: product.id,
          productName: product.name,
          category: product.category?.name || 'Sem categoria',
          currentStock: totalStock,
          minStockLevel: minLevel,
          unit: product.unit,
          location: product.inventory.map((i: any) => i.location.name).join(', ') || 'Sem localização',
          severity,
          percentageRemaining: percentage,
          suggestedOrderQuantity: Math.max(minLevel * 3 - totalStock, 0)
        }
      })
      .filter((item: any) => item !== null)

    // Sort by severity
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const alerts = lowStockItems.sort((a: any, b: any) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      totalProducts: products.length,
      lowStockCount: alerts.length,
      alerts,
      summary: {
        critical: alerts.filter((a: any) => a.severity === 'CRITICAL').length,
        high: alerts.filter((a: any) => a.severity === 'HIGH').length,
        medium: alerts.filter((a: any) => a.severity === 'MEDIUM').length,
        low: alerts.filter((a: any) => a.severity === 'LOW').length
      }
    })
  } catch (error) {
    logger.error('Error checking stock levels:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar níveis de estoque' },
      { status: 500 }
    )
  }
})

// Create notification for low stock items
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json()
    const { productId, notifyUsers } = body

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          select: {
            quantity: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Calculate total stock
    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    const minLevel = product.minStock || 10
    const percentage = minLevel > 0 ? (totalStock / minLevel) * 100 : 0

    // Get admin users to notify
    const usersToNotify = notifyUsers || await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN'] },
        isActive: true
      },
      select: { id: true }
    })

    // Create notifications
    const notifications = await Promise.all(
      usersToNotify.map((u: any) =>
        prisma.notification.create({
          data: {
            userId: typeof u === 'string' ? u : u.id,
            type: 'SYSTEM',
            title: `Estoque Baixo: ${product.name}`,
            message: `O produto "${product.name}" está com apenas ${totalStock} ${product.unit} em estoque (${percentage.toFixed(0)}% do mínimo). Nível mínimo: ${minLevel} ${product.unit}.`,
            priority: totalStock === 0 ? 'HIGH' : 'MEDIUM',
            read: false
          }
        })
      )
    )

    return NextResponse.json({
      message: 'Notificações criadas com sucesso',
      notificationsSent: notifications.length
    })
  } catch (error) {
    logger.error('Error creating stock alerts:', error)
    return NextResponse.json(
      { error: 'Erro ao criar alertas de estoque' },
      { status: 500 }
    )
  }
})
