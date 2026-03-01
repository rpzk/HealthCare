import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setupTwoFactor } from '@/lib/two-factor'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/2fa/setup
 * Inicia configuração do 2FA para o usuário logado
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
    
    const result = await setupTwoFactor(session.user.id)
    
    logger.info({ userId: session.user.id }, '2FA setup iniciado')
    
    return NextResponse.json({
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes
    })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao configurar 2FA')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao configurar 2FA' },
      { status: 400 }
    )
  }
}
