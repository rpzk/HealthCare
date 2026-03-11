import { NextResponse } from 'next/server'
import { createAuthenticationOptions, WEBAUTHN_AUTH_CHALLENGE_COOKIE } from '@/lib/webauthn'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { email?: string }
    if (!body?.email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }
    const options = await createAuthenticationOptions(body.email, req as any)
    const res = NextResponse.json(options)

    // Fallback em cookie para dev sem Redis
    const isSecure = process.env.NODE_ENV === 'production'
    res.cookies.set(WEBAUTHN_AUTH_CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 300, // 5 min
      path: '/',
    })

    return res
  } catch (error: any) {
    logger.error('Erro ao gerar options de autenticação WebAuthn:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
