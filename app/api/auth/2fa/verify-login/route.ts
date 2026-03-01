import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyTwoFactorToken } from '@/lib/two-factor'

/**
 * API para verificar código 2FA durante o login
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, token } = await req.json()

    if (!email || !password || !token) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
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

    // Verificar se 2FA está habilitado
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA não está habilitado para este usuário' },
        { status: 400 }
      )
    }

    // Verificar código 2FA
    const valid = await verifyTwoFactorToken(user.id, token)

    if (!valid) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao verificar 2FA no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
