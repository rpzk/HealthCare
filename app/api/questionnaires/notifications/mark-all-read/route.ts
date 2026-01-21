import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// PATCH - Marcar todas as notificações como lidas
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
        type: {
          in: [
            'QUESTIONNAIRE_SENT',
            'QUESTIONNAIRE_COMPLETED',
            'QUESTIONNAIRE_EXPIRED',
            'AI_ANALYSIS_READY',
          ],
        },
      },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Erro ao marcar todas como lidas:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar notificações' },
      { status: 500 }
    )
  }
}
