import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/exam-requests/[id]
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const item = await prisma.examRequest.findUnique({
      where: { id: String(id) },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, speciality: true } },
      },
    })
    if (!item) return NextResponse.json({ error: 'Solicitação de exame não encontrada' }, { status: 404 })

    if (item.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    return NextResponse.json(item)
  } catch (error) {
    logger.error('Erro ao buscar solicitação de exame:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
