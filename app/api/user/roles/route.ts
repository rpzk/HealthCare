import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Buscar papéis do usuário logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Buscar papéis atribuídos
    const assignedRoles = await prisma.userAssignedRole.findMany({
      where: { userId },
      select: {
        role: true,
        isPrimary: true
      },
      orderBy: [
        { isPrimary: 'desc' },
        { assignedAt: 'asc' }
      ]
    })

    // Se não tem papéis atribuídos, usar o papel legado do usuário
    if (assignedRoles.length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      return NextResponse.json({
        roles: [{ role: user?.role || 'DOCTOR', isPrimary: true }],
        primaryRole: user?.role || 'DOCTOR'
      })
    }

    const primaryRole = assignedRoles.find(r => r.isPrimary)?.role || assignedRoles[0].role

    return NextResponse.json({
      roles: assignedRoles,
      primaryRole
    })
  } catch (error) {
    console.error('Erro ao buscar papéis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
