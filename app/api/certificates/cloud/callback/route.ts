/**
 * GET /api/certificates/cloud/callback
 *
 * OAuth2 callback — recebe o authorization code do provedor
 * após o médico autorizar via QR Code ou Push.
 *
 * POST /api/certificates/cloud/callback
 *
 * Alternativa para exchange manual (push polling ou redirect).
 * Body: { state, code } ou { state, pushCode }
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { logger } from '@/lib/logger'
import {
  getPKCE,
  exchangeCodeForToken,
  storeCloudSession,
  checkPushAuthStatus,
} from '@/lib/cloud-signing-service'

// GET — OAuth2 redirect callback (QR Code flow)
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?cloud_error=missing_params', request.url))
  }

  const pkceData = getPKCE(state)
  if (!pkceData) {
    return NextResponse.redirect(new URL('/settings?cloud_error=invalid_state', request.url))
  }

  try {
    const session = await exchangeCodeForToken(
      pkceData.provider,
      code,
      pkceData.codeVerifier,
    )

    storeCloudSession(user.id, session)

    logger.info(
      { userId: user.id, provider: session.provider },
      'Sessão cloud iniciada via QR Code',
    )

    return NextResponse.redirect(new URL('/settings?cloud_success=true', request.url))
  } catch (err) {
    logger.error({ err, provider: pkceData.provider }, 'Falha no callback cloud')
    return NextResponse.redirect(new URL('/settings?cloud_error=token_exchange_failed', request.url))
  }
})

// POST — Exchange manual (push polling ou JS redirect)
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const { state, code, pushCode } = body

    if (!state) {
      return NextResponse.json({ error: 'State obrigatório' }, { status: 400 })
    }

    const pkceData = getPKCE(state)
    if (!pkceData) {
      return NextResponse.json({ error: 'State inválido ou expirado. Tente novamente.' }, { status: 400 })
    }

    let finalCode = code

    // Se é push, verificar status primeiro
    if (pushCode && !code) {
      const status = await checkPushAuthStatus(pkceData.provider, pushCode)
      if (!status.completed) {
        // Re-store PKCE para próximo polling
        const { storePKCE } = await import('@/lib/cloud-signing-service')
        storePKCE(state, pkceData)
        return NextResponse.json({
          status: 'pending',
          message: 'Aguardando autorização no celular...',
        })
      }
      finalCode = status.authorizationToken || status.code
    }

    if (!finalCode) {
      return NextResponse.json({ error: 'Código de autorização não encontrado' }, { status: 400 })
    }

    const session = await exchangeCodeForToken(
      pkceData.provider,
      finalCode,
      pkceData.codeVerifier,
    )

    storeCloudSession(user.id, session)

    logger.info(
      { userId: user.id, provider: session.provider },
      'Sessão cloud iniciada',
    )

    return NextResponse.json({
      status: 'success',
      provider: session.provider,
      providerName: session.provider === 'birdid' ? 'BirdID' : 'VIDaaS',
      expiresAt: session.expiresAt.toISOString(),
      remainingSeconds: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
    })
  } catch (err) {
    logger.error({ err }, 'Erro no callback cloud')
    return NextResponse.json(
      { error: (err as Error)?.message || 'Falha na autorização' },
      { status: 500 },
    )
  }
})
