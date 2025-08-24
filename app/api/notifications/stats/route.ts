import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const stats = await NotificationService.getNotificationStats(user.id)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.NOTIFICATION_READ,
      'Notification Stats',
      { statsRequested: true }
    )

    return NextResponse.json(stats)

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.NOTIFICATION_READ,
      'Notification Stats',
      error.message
    )

    console.error('Erro ao buscar estatísticas de notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const success = await NotificationService.markAllAsRead(user.id)
    
    if (success) {
      auditLogger.logSuccess(
        user.id,
        user.email,
        user.role,
        AuditAction.NOTIFICATION_UPDATE,
        'Mark All Read',
        { action: 'mark_all_read' }
      )

      return NextResponse.json({ success: true })
    } else {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.NOTIFICATION_UPDATE,
        'Mark All Read',
        'Falha ao marcar todas como lidas'
      )

      return NextResponse.json(
        { error: 'Erro ao marcar todas como lidas' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.NOTIFICATION_UPDATE,
      'Mark All Read',
      error.message
    )

    console.error('Erro ao marcar todas como lidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
