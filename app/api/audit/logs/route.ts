import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth-v2'
import { prisma } from '@/lib/prisma'

// GET /api/audit/logs?limit=50&userId=...&action=...
export const GET = withAdminAuthUnlimited(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const resource = searchParams.get('resource') || undefined

    const where: any = {}
    if (userId) where.userId = userId
    if (action) where.action = action
    if (resource) where.resource = resource

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ logs, count: logs.length })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao recuperar logs', message: e.message }, { status: 500 })
  }
})
