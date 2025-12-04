/**
 * API para conectar Google Calendar
 * 
 * GET /api/calendar/google/connect
 * 
 * Redireciona o usuário para autorização do Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleAuthUrl } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Verificar se Google Calendar está configurado
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google Calendar não está configurado no sistema' },
        { status: 500 }
      )
    }

    const authUrl = getGoogleAuthUrl(session.user.id)
    
    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('[Google Calendar Connect] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar conexão com Google Calendar' },
      { status: 500 }
    )
  }
}
