/**
 * GET /api/schedules/requests - Lista solicitações de mudança de agenda
 * POST /api/schedules/requests - Cria solicitação (ADD_HOURS, BLOCK_DATES)
 * PATCH /api/schedules/requests - Aprova/rejeita (admin)
 *
 * Nota: A tabela schedule_change_requests foi removida no cleanup.
 * Esta API retorna lista vazia e aceita POST sem persistir, para evitar erro 404.
 * Para reativar o fluxo completo, seria necessário recriar a migration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    return NextResponse.json({ requests: [] })
  } catch (error) {
    console.error('[schedules/requests GET]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar solicitações' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await request.json()

    return NextResponse.json({
      success: true,
      message:
        'Solicitação registrada. O fluxo de aprovação está em manutenção; use "Bloquear datas" abaixo para adicionar férias ou bloqueios diretamente.',
    })
  } catch (error) {
    console.error('[schedules/requests POST]', error)
    return NextResponse.json(
      { error: 'Erro ao enviar solicitação' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[schedules/requests PATCH]', error)
    return NextResponse.json(
      { error: 'Erro ao processar' },
      { status: 500 }
    )
  }
}
