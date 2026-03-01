import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTwoFactorToken } from '@/lib/two-factor'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET!

/**
 * POST /api/auth/2fa/login
 * Verifica código 2FA durante o login
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tempToken, token } = body
    
    if (!tempToken || !token) {
      return NextResponse.json(
        { error: 'Token temporário e código 2FA são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Verificar token temporário
    let decoded: any
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET)
    } catch (error) {
      logger.warn('Token temporário inválido ou expirado')
      return NextResponse.json(
        { error: 'Sessão expirada. Faça login novamente.' },
        { status: 401 }
      )
    }
    
    const { userId, requiresTwoFactor } = decoded
    
    if (!requiresTwoFactor) {
      return NextResponse.json(
        { error: 'Esta conta não requer 2FA' },
        { status: 400 }
      )
    }
    
    // Verificar código 2FA
    const verified = await verifyTwoFactorToken(userId, token)
    
    if (!verified) {
      logger.warn({ userId }, 'Código 2FA inválido durante login')
      return NextResponse.json(
        { error: 'Código inválido ou expirado' },
        { status: 400 }
      )
    }
    
    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    })
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Usuário inválido' },
        { status: 401 }
      )
    }
    
    // Log de autenticação bem-sucedida
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userRole: 'AUTH',
        action: 'LOGIN_SUCCESS',
        resourceType: 'Authentication',
        success: true,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        metadata: { method: '2fa', role: user.role }
      }
    })
    
    logger.info({ userId, email: user.email }, '2FA verificado com sucesso no login')
    
    // Retornar sucesso (o frontend vai chamar signIn do NextAuth com credenciais)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao verificar 2FA no login')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar código' },
      { status: 500 }
    )
  }
}
