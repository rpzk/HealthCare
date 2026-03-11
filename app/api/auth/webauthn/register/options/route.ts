import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistrationOptions, WEBAUTHN_REG_CHALLENGE_COOKIE } from '@/lib/webauthn'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const options = await createRegistrationOptions(session.user.id, session.user.email, req as any)
    const res = NextResponse.json(options)
    // Fallback em cookie para dev sem Redis - desafio viaja com a requisição
    const isSecure = process.env.NODE_ENV === 'production'
    res.cookies.set(WEBAUTHN_REG_CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 300, // 5 min
      path: '/',
    })
    return res
  } catch (error: any) {
    logger.error('Erro ao gerar options de registro WebAuthn:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
