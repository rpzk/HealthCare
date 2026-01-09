import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET /api/referrals/[id]
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const item = await prisma.referral.findUnique({
      where: { id: String(id) },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, speciality: true } },
      },
    })
    if (!item) return NextResponse.json({ error: 'Encaminhamento não encontrado' }, { status: 404 })

    // Authorization: author doctor or admins can view
    if (item.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Erro ao buscar encaminhamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
