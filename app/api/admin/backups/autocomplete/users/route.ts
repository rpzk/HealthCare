import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/backups/autocomplete/users?q=termo
 * Autocomplete para busca de usuários (profissionais, admins, etc)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { crmNumber: { contains: q } },
          { licenseNumber: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        crmNumber: true,
        licenseNumber: true,
        licenseType: true,
      },
      take: 10,
    })

    const results = users.map((u) => {
      const license = u.crmNumber || u.licenseNumber || 'N/A'
      const licenseType = u.licenseType || (u.crmNumber ? 'CRM' : '')
      return {
        id: u.id,
        label: `${u.name} - ${u.role} - ${licenseType} ${license} - ${u.email}`,
        value: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        licenseNumber: u.licenseNumber || u.crmNumber,
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    console.error('[Autocomplete Users] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao buscar usuários' }, { status: 500 })
  }
}
