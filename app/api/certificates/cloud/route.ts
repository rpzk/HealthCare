/**
 * API de certificados em nuvem (BirdID / VIDaaS)
 *
 * GET  — Status da sessão cloud + provedores disponíveis
 * POST — Iniciar fluxo de autorização (QR Code ou Push)
 * DELETE — Encerrar sessão cloud
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { logger } from '@/lib/logger'
import {
  getAvailableProviders,
  getProviderConfig,
  getCloudSession,
  clearCloudSession,
  hasActiveCloudSession,
  generatePKCE,
  buildAuthorizeUrl,
  startPushAuthorization,
  storePKCE,
  discoverUser,
  type CloudProvider,
  type AuthMethod,
} from '@/lib/cloud-signing-service'

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  const providers = getAvailableProviders()
  const session = getCloudSession(user.id)

  return NextResponse.json({
    providers: providers.map((p) => ({
      id: p,
      name: p === 'birdid' ? 'BirdID (Soluti)' : 'VIDaaS (VALID)',
      configured: !!getProviderConfig(p),
    })),
    session: session
      ? {
          provider: session.provider,
          providerName: session.provider === 'birdid' ? 'BirdID' : 'VIDaaS',
          cpf: session.cpf ? `***.***.${session.cpf.slice(-5, -2)}-${session.cpf.slice(-2)}` : '',
          expiresAt: session.expiresAt.toISOString(),
          remainingSeconds: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
          active: true,
        }
      : { active: false },
  })
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const provider = body.provider as CloudProvider
    const method = (body.method || 'qrcode') as AuthMethod
    const cpf = body.cpf as string
    const lifetime = body.lifetime as number | undefined

    if (!provider || !['birdid', 'vidaas'].includes(provider)) {
      return NextResponse.json({ error: 'Provedor inválido. Use "birdid" ou "vidaas".' }, { status: 400 })
    }

    const config = getProviderConfig(provider)
    if (!config) {
      return NextResponse.json(
        { error: `Provedor ${provider} não configurado. Configure CLIENT_ID e CLIENT_SECRET nas variáveis de ambiente.` },
        { status: 400 },
      )
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    // Verificar se o CPF tem certificado no provedor
    let discovery
    try {
      discovery = await discoverUser(provider, cpf)
    } catch (err) {
      logger.warn({ err, provider }, 'Falha no user-discovery')
    }

    if (discovery && !discovery.found) {
      return NextResponse.json(
        { error: `Nenhum certificado em nuvem encontrado para este CPF no ${provider === 'birdid' ? 'BirdID' : 'VIDaaS'}. Verifique se o certificado está ativo.` },
        { status: 404 },
      )
    }

    const pkce = generatePKCE()
    const state = crypto.randomUUID()

    storePKCE(state, { codeVerifier: pkce.codeVerifier, provider, cpf })

    if (method === 'push') {
      try {
        const pushResult = await startPushAuthorization(
          { provider, cpf, scope: 'signature_session', lifetime },
          pkce,
        )
        return NextResponse.json({
          method: 'push',
          state,
          pushCode: pushResult.code,
          message: 'Notificação enviada para o celular. Autorize no app.',
        })
      } catch (err) {
        logger.error({ err, provider }, 'Falha ao iniciar push authorization')
        return NextResponse.json(
          { error: 'Falha ao enviar notificação push. Tente via QR Code.' },
          { status: 500 },
        )
      }
    }

    // QR Code — retorna URL para exibir
    const authorizeUrl = buildAuthorizeUrl(
      { provider, cpf, scope: 'signature_session', lifetime, state },
      pkce,
    )

    return NextResponse.json({
      method: 'qrcode',
      authorizeUrl,
      state,
      message: 'Escaneie o QR Code com o app do provedor.',
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao iniciar autorização cloud')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_request: NextRequest, { user }) => {
  if (hasActiveCloudSession(user.id)) {
    clearCloudSession(user.id)
    return NextResponse.json({ success: true, message: 'Sessão cloud encerrada' })
  }
  return NextResponse.json({ success: true, message: 'Nenhuma sessão ativa' })
})
