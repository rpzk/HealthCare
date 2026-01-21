import { NextResponse } from 'next/server'
import { createAuthenticationOptions } from '@/lib/webauthn'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { email?: string }
    if (!body?.email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }
    const options = await createAuthenticationOptions(body.email, req as any)
    return NextResponse.json(options)
  } catch (error: any) {
    logger.error('Erro ao gerar options de autenticação WebAuthn:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
