import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyAndEnableTwoFactor } from '@/lib/two-factor'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/2fa/verify
 * Verifica código TOTP e habilita 2FA
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      )
    }
    
    const verified = await verifyAndEnableTwoFactor(session.user.id, token)
    
    if (!verified) {
      logger.warn({ userId: session.user.id }, 'Código 2FA inválido durante setup')
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }
    
    logger.info({ userId: session.user.id }, '2FA habilitado com sucesso')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao verificar 2FA')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar código' },
      { status: 400 }
    )
  }
}
