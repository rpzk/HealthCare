import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper para verificar se o usuário é admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      role: true,
      assignedRoles: {
        select: { role: true }
      }
    }
  })

  const userRole = user?.role
  const assignedRoles = user?.assignedRoles?.map(r => r.role) || []
  return userRole === 'ADMIN' || assignedRoles.includes('ADMIN')
}

// GET - Listar papéis atribuídos a um usuário
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin((session.user as any).id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: (session.user as any).id,
        audience: getAudienceForRole((session.user as any).role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const userId = params.id

    // Buscar usuário com papéis atribuídos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true, // Papel principal (legado)
        assignedRoles: {
          select: {
            id: true,
            role: true,
            isPrimary: true,
            assignedAt: true,
            assignedBy: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { assignedAt: 'asc' }
          ]
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    logger.error('Erro ao buscar papéis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Atribuir um novo papel a um usuário
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin((session.user as any).id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: (session.user as any).id,
        audience: getAudienceForRole((session.user as any).role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const userId = params.id
    const body = await request.json()
    const { role, isPrimary = false } = body

    if (!role) {
      return NextResponse.json({ error: 'Papel é obrigatório' }, { status: 400 })
    }

    // Validar se o papel é válido
    const validRoles = [
      'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHYSIOTHERAPIST',
      'PSYCHOLOGIST', 'HEALTH_AGENT', 'TECHNICIAN', 'PHARMACIST',
      'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER', 'PATIENT'
    ]

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Se for papel primário, remover isPrimary de outros
    if (isPrimary) {
      await prisma.userAssignedRole.updateMany({
        where: { userId },
        data: { isPrimary: false }
      })
    }

    // Criar ou atualizar a atribuição
    const assignedRole = await prisma.userAssignedRole.upsert({
      where: {
        userId_role: { userId, role }
      },
      update: {
        isPrimary,
        assignedBy: (session.user as any).id
      },
      create: {
        userId,
        role,
        isPrimary,
        assignedBy: (session.user as any).id
      }
    })

    // Se for papel primário, atualizar o campo role do usuário também (para compatibilidade)
    if (isPrimary) {
      await prisma.user.update({
        where: { id: userId },
        data: { role }
      })
    }

    return NextResponse.json(assignedRole, { status: 201 })
  } catch (error) {
    logger.error('Erro ao atribuir papel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover um papel atribuído
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin((session.user as any).id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: (session.user as any).id,
        audience: getAudienceForRole((session.user as any).role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const userId = params.id
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role) {
      return NextResponse.json({ error: 'Papel é obrigatório' }, { status: 400 })
    }

    // Verificar se existe
    const existing = await prisma.userAssignedRole.findUnique({
      where: {
        userId_role: { userId, role: role as any }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Papel não encontrado' }, { status: 404 })
    }

    // Não permitir remover o último papel
    const count = await prisma.userAssignedRole.count({
      where: { userId }
    })

    if (count <= 1) {
      return NextResponse.json(
        { error: 'Usuário deve ter pelo menos um papel' },
        { status: 400 }
      )
    }

    // Se for o papel primário, definir outro como primário
    if (existing.isPrimary) {
      const another = await prisma.userAssignedRole.findFirst({
        where: {
          userId,
          role: { not: role as any }
        }
      })

      if (another) {
        await prisma.userAssignedRole.update({
          where: { id: another.id },
          data: { isPrimary: true }
        })

        // Atualizar o campo role do usuário
        await prisma.user.update({
          where: { id: userId },
          data: { role: another.role }
        })
      }
    }

    // Remover
    await prisma.userAssignedRole.delete({
      where: {
        userId_role: { userId, role: role as any }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erro ao remover papel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
