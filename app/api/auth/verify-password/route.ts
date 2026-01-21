import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

// POST - Verificar senha do usuário logado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Buscar usuário com senha
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar senha
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erro ao verificar senha:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
