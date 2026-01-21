import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/backups/autocomplete/patients?q=termo
 * Autocomplete para busca de pacientes
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

    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { cpf: { contains: q.replace(/\D/g, '') } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
      },
      take: 10,
    })

    const results = patients.map((p) => ({
      id: p.id,
      label: `${p.name} - CPF: ${p.cpf || 'N/A'} - Email: ${p.email || 'N/A'}`,
      value: p.id,
      cpf: p.cpf,
      email: p.email,
      name: p.name,
    }))

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    logger.error('[Autocomplete Patients] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao buscar pacientes' }, { status: 500 })
  }
}
