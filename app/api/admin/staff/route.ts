import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

// GET - Listar todos os profissionais (staff)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem acessar' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: (session.user as any).id,
      audience: getAudienceForRole(userRole),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      role: { not: 'PATIENT' } // Não mostrar pacientes
    }

    if (role && role !== 'ALL') {
      where.role = role
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [staff, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          speciality: true,
          phone: true,
          crmNumber: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    // Contar por role
    const counts = await prisma.user.groupBy({
      by: ['role'],
      where: { role: { not: 'PATIENT' } },
      _count: true,
    })

    const roleStats = counts.reduce((acc, c) => {
      acc[c.role] = c._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        staff,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: {
          total: Object.values(roleStats).reduce((a, b) => a + b, 0),
          byRole: roleStats
        }
      }
    })
  } catch (error) {
    console.error('[staff] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar profissionais' }, { status: 500 })
  }
}
