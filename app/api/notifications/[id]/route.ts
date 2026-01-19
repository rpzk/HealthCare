import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// Schema de validação para ações PATCH
const patchNotificationSchema = z.object({
  action: z.enum(['mark_read'], {
    errorMap: () => ({ message: 'Ação deve ser "mark_read"' })
  })
})

// PATCH - Marcar notificação como lida
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const body = await request.json()
    
    // Validação com Zod
    const validationResult = patchNotificationSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ')
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const { action } = validationResult.data

    if (action === 'mark_read') {
      const success = await NotificationService.markAsRead(params.id, user.id)
      
      if (success) {
        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.NOTIFICATION_UPDATE,
          'Notification',
          { 
            notificationId: params.id,
            action: action
          }
        )
        
        return NextResponse.json({ 
          success: true,
          message: 'Notificação marcada como lida'
        })
      } else {
        auditLogger.logError(
          user.id,
          user.email,
          user.role,
          AuditAction.NOTIFICATION_UPDATE,
          'Notification',
          'Falha ao atualizar notificação',
          { notificationId: params.id, action: action }
        )
        
        return NextResponse.json(
          { error: 'Erro ao marcar como lida' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    )

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.NOTIFICATION_UPDATE,
      'Notification',
      error.message,
      { notificationId: params.id }
    )
    
    console.error('Erro ao atualizar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// DELETE - Excluir notificação
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    const success = await NotificationService.deleteNotification(params.id, user.id)
    
    if (success) {
      auditLogger.logSuccess(
        user.id,
        user.email,
        user.role,
        AuditAction.NOTIFICATION_DELETE,
        'Notification',
        { notificationId: params.id }
      )
      
      return NextResponse.json({ 
        success: true,
        message: 'Notificação excluída com sucesso'
      })
    } else {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.NOTIFICATION_DELETE,
        'Notification',
        'Falha ao excluir notificação',
        { notificationId: params.id }
      )
      
      return NextResponse.json(
        { error: 'Erro ao excluir notificação' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.NOTIFICATION_DELETE,
      'Notification',
      error.message,
      { notificationId: params.id }
    )
    
    console.error('Erro ao excluir notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
