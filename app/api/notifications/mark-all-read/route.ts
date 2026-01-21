import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { withAuth } from '@/lib/with-auth'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request, { user }) => {
  try {
    await NotificationService.markAllAsRead(user.id)
    return NextResponse.json({ 
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    })
  } catch (error: any) {
    logger.error('Erro ao marcar todas como lidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
