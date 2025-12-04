/**
 * API para sincronizar consultas com Google Calendar
 * 
 * POST /api/calendar/google/sync
 * 
 * Sincroniza consultas futuras do médico com seu Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncConsultationsToGoogleCalendar } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const result = await syncConsultationsToGoogleCalendar(session.user.id)

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${result.synced} consultas sincronizadas, ${result.errors} erros`,
      ...result,
    })

  } catch (error) {
    console.error('[Google Calendar Sync] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar com Google Calendar' },
      { status: 500 }
    )
  }
}
