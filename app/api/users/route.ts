import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPatientAuth } from '@/lib/advanced-auth-v2'

// GET /api/users - Listar usuários (profissionais de saúde)
export const GET = withPatientAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const role = searchParams.get('role') || undefined
    const roles = searchParams.get('roles') || undefined // Suporte para múltiplos roles

    // Construir filtros
    const where: any = {
      isActive: true,
    }

    // Busca por nome ou email
    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtro por role (único ou múltiplos)
    if (roles) {
      // Suporte para múltiplos roles separados por vírgula
      const roleList = roles.split(',').map(r => r.trim()).filter(Boolean)
      if (roleList.length > 0) {
        where.role = { in: roleList }
      }
    } else if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        speciality: true,
        crmNumber: true,
        isActive: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    // Mapear para formato esperado pelo frontend
    const formattedUsers = users.map(u => ({
      ...u,
      specialty: u.speciality,
      crm: u.crmNumber,
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
