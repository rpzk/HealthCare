import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Definir papel ativo (apenas valida se o usuário tem esse papel)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { role } = await request.json()
    
    if (!role) {
      return NextResponse.json({ error: 'Papel não informado' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Verificar se o usuário tem esse papel
    const availableRoles = (session.user as any).availableRoles || []
    
    // Buscar do banco se não tiver na sessão
    if (availableRoles.length === 0) {
      const assignedRoles = await prisma.userAssignedRole.findMany({
        where: { userId },
        select: { role: true }
      })

      if (assignedRoles.length > 0) {
        availableRoles.push(...assignedRoles.map(r => r.role))
      } else {
        // Fallback para o role padrão do usuário
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        })
        if (user) {
          availableRoles.push(user.role)
        }
      }
    }

    // Verificar se o papel solicitado está disponível
    if (!availableRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para usar esse papel' },
        { status: 403 }
      )
    }

    // Cookie será definido no cliente, aqui só validamos
    return NextResponse.json({
      success: true,
      role,
      message: 'Papel ativo atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao definir papel ativo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
