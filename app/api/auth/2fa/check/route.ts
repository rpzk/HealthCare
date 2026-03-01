import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * API para verificar se usuário tem 2FA habilitado (sem fazer login)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' }
      },
      select: {
        id: true,
        password: true,
        isActive: true,
        twoFactorEnabled: true
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    if (!user.password) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Retornar status de 2FA
    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled || false
    })
  } catch (error) {
    console.error('Erro ao verificar 2FA:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
