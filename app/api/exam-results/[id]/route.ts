import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET /api/exam-results/[id]
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const result = await prisma.examResult.findUnique({
      where: { id: String(id) },
      include: { patient: { select: { id: true, name: true } } },
    })
    if (!result) return NextResponse.json({ error: 'Resultado de exame não encontrado' }, { status: 404 })

    // Authorization: allow admins and doctors
    if (user.role !== 'ADMIN' && user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar resultado de exame:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
