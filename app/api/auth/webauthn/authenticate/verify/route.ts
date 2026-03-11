export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponseForUser } from '@/lib/webauthn'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/webauthn/authenticate/verify
 * Verifica a resposta de autenticação WebAuthn
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, response } = body
    
    if (!email || !response) {
      return NextResponse.json(
        { error: 'Email e resposta são obrigatórios' },
        { status: 400 }
      )
    }
    
    const verification = await verifyAuthenticationResponseForUser(email, response, req)
    
    if (!verification.verified) {
      logger.warn({ email }, 'Autenticação WebAuthn falhou')
      return NextResponse.json(
        { error: 'Autenticação falhou' },
        { status: 400 }
      )
    }
    
    logger.info({ email }, 'Autenticação WebAuthn bem-sucedida')
    
    return NextResponse.json({ 
      verified: true,
      credentialId: verification.authenticationInfo?.credentialID
    })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao verificar autenticação WebAuthn')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar autenticação' },
      { status: 500 }
    )
  }
}
