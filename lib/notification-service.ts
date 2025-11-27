import { PrismaClient } from '@prisma/client'

// Direct PrismaClient instantiation to avoid bundling issues
const globalForNotification = globalThis as unknown as { notificationPrisma: PrismaClient }

function getNotificationPrisma() {
  if (!globalForNotification.notificationPrisma) {
    globalForNotification.notificationPrisma = new PrismaClient()
  }
  return globalForNotification.notificationPrisma
}

export interface Notification {
  id: string
  userId: string
  type: string
  priority: string
  title: string
  message: string
  read: boolean
  metadata: Record<string, unknown> | null
  expiresAt: Date | null
  createdAt: Date
}

export type NotificationType = 
  | 'ai_analysis_complete'
  | 'critical_alert'
  | 'drug_interaction_warning'
  | 'system_status'
  | 'appointment_reminder'
  | 'patient_update'
  | 'appointment'
  | 'exam'
  | 'alert'
  | 'system'
  | 'patient'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface NotificationCreateData {
  type: NotificationType | string
  priority: NotificationPriority | string
  title: string
  message: string
  userId: string
  metadata?: Record<string, unknown>
  expiresAt?: Date
}

export class NotificationService {
  static async createNotification(data: NotificationCreateData) {
    try {
      const prisma = getNotificationPrisma()
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (data.metadata || {}) as any,
          expiresAt: data.expiresAt
        }
      })
      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  static async getUserNotifications(userId: string, filters: { unreadOnly?: boolean, limit?: number, priority?: string, type?: string } | boolean = {}): Promise<Notification[]> {
    const prisma = getNotificationPrisma()
    const options = typeof filters === 'boolean' ? { unreadOnly: filters } : filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, unknown> = { userId }
    if (options.unreadOnly) where.read = false
    if (options.priority) where.priority = options.priority
    if (options.type) where.type = options.type

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50
    }) as unknown as Notification[]
  }

  static async deleteNotification(id: string) {
    const prisma = getNotificationPrisma()
    return prisma.notification.delete({
      where: { id }
    })
  }

  static async markAsRead(id: string) {
    const prisma = getNotificationPrisma()
    return prisma.notification.update({
      where: { id },
      data: { read: true }
    })
  }

  static async markAllAsRead(userId: string) {
    const prisma = getNotificationPrisma()
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const prisma = getNotificationPrisma()
    return prisma.notification.count({
      where: { userId, read: false }
    })
  }

  static async getNotificationStats(userId: string) {
    const prisma = getNotificationPrisma()
    const [total, unread, byType, byPriority] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId, read: false },
        _count: { priority: true }
      })
    ])
    
    return {
      total,
      unread,
      read: total - unread,
      byType: byType.map(t => ({ type: t.type, count: t._count.type })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count.priority }))
    }
  }

  // Notificações automáticas
  static async notifyAIAnalysisComplete(userId: string, patientName: string, analysisType: string) {
    return this.createNotification({
      type: 'ai_analysis_complete',
      priority: 'medium',
      title: 'Análise IA Concluída',
      message: `Análise de ${analysisType} para ${patientName} foi concluída.`,
      userId,
      metadata: { patientName, analysisType }
    })
  }

  static async notifyCriticalAlert(userId: string, title: string, message: string, metadata?: Record<string, any>) {
    return this.createNotification({
      type: 'critical_alert',
      priority: 'critical',
      title,
      message,
      userId,
      metadata
    })
  }

  static async notifyAppointmentReminder(userId: string, patientName: string, time: string) {
    return this.createNotification({
      type: 'appointment_reminder',
      priority: 'high',
      title: 'Lembrete de Consulta',
      message: `Consulta com ${patientName} agendada para ${time}.`,
      userId,
      metadata: { patientName, time }
    })
  }
}
