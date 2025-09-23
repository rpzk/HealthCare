import { NextResponse } from 'next/server'
import { withAuth, validateRequestBody } from '@/lib/with-auth'
import { validateNotification } from '@/lib/validation-schemas'
import { NotificationService } from '@/lib/notification-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Buscar notificações do usuário
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
  const priority = searchParams.get('priority') as any
  const type = searchParams.get('type') as any

  const notifications = await NotificationService.getUserNotifications(
    user.id,
    { unreadOnly, limit, priority, type }
  )

  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.NOTIFICATION_READ,
    'notifications',
    { count: notifications.length, filters: { unreadOnly, priority, type } }
  )

  return NextResponse.json(notifications)
})

// POST - Criar nova notificação
export const POST = withAuth(async (request, { user }) => {
  const validation = await validateRequestBody(request, validateNotification)
  if (!validation.success) {
    return validation.response!
  }

  const data = validation.data!

  const notification = await NotificationService.createNotification({
    type: data.type,
    priority: data.priority,
    title: data.title,
    message: data.message,
    userId: user.id,
    patientId: data.patientId,
    consultationId: data.consultationId,
    metadata: data.metadata
  })

  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.NOTIFICATION_CREATE,
    'notifications',
    { notificationId: notification.id, type: data.type, priority: data.priority }
  )

  return NextResponse.json(notification, { status: 201 })
})
