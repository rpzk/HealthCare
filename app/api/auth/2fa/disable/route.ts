export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disableTwoFactor } from '@/lib/two-factor'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/2fa/disable
 * Desabilita 2FA (requer senha)
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
    const { password } = body
    
    if (!password) {
      return NextResponse.json(
        { error: 'Senha não fornecida' },
        { status: 400 }
      )
    }
    
    await disableTwoFactor(session.user.id, password)
    
    logger.info({ userId: session.user.id }, '2FA desabilitado')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao desabilitar 2FA')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao desabilitar 2FA' },
      { status: 400 }
    )
  }
}
