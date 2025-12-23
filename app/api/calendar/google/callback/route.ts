/**
 * Callback do Google Calendar OAuth
 * 
 * GET /api/calendar/google/callback
 * 
 * Recebe o código de autorização e salva os tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens, GOOGLE_CALENDAR_SCOPES } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // userId
    const error = searchParams.get('error')

    // Verificar erro do Google
    if (error) {
      console.error('[Google Calendar Callback] Error from Google:', error)
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent('Autorização negada pelo Google')}`, request.url)
      )
    }

    // Verificar parâmetros
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=Parâmetros inválidos', request.url)
      )
    }

    // Trocar código por tokens
    const tokens = await exchangeCodeForTokens(code)

    // Salvar integração no banco
    await (prisma as any).userIntegration.upsert({
      where: {
        userId_provider: {
          userId: state,
          provider: 'google_calendar',
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: GOOGLE_CALENDAR_SCOPES.join(' '),
        active: true,
        updatedAt: new Date(),
      },
      create: {
        userId: state,
        provider: 'google_calendar',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: GOOGLE_CALENDAR_SCOPES.join(' '),
        active: true,
      },
    })

    // Redirecionar para página de sucesso
    return NextResponse.redirect(
      new URL('/settings/integrations?success=Google Calendar conectado com sucesso!', request.url)
    )

  } catch (error) {
    console.error('[Google Calendar Callback] Error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=Erro ao conectar Google Calendar', request.url)
    )
  }
}
