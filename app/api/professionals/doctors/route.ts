import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const role = (session.user as any)?.role as string | undefined
    if (role === 'PATIENT') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        speciality: true,
      },
      orderBy: [{ name: 'asc' }],
    })

    return NextResponse.json({ doctors })
  } catch (error) {
    logger.error('Error fetching doctors:', error)
    return NextResponse.json({ error: 'Erro ao buscar médicos' }, { status: 500 })
  }
}
