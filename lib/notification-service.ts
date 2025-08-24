import { prisma } from '@/lib/prisma'

export type NotificationType = 
  | 'ai_analysis_complete'
  | 'critical_alert'
  | 'drug_interaction_warning'
  | 'system_status'
  | 'appointment_reminder'
  | 'patient_update'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Notification {
  id?: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  userId: string
  patientId?: string
  consultationId?: string
  metadata?: Record<string, any>
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

export class NotificationService {
  // Criar nova notificação
  static async createNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    try {
      // Em produção, salvaria no banco de dados
      const notification: Notification = {
        id: this.generateId(),
        read: false,
        createdAt: new Date(),
        ...data
      }

      // Log para desenvolvimento
      console.log('📢 Nova notificação:', notification)

      // Em produção: salvar no banco e enviar via WebSocket/SSE
      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Buscar notificações do usuário
  static async getUserNotifications(
    userId: string, 
    options: {
      unreadOnly?: boolean
      limit?: number
      priority?: NotificationPriority
      type?: NotificationType
    } = {}
  ): Promise<Notification[]> {
    try {
      // Mock data para desenvolvimento
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'ai_analysis_complete',
          priority: 'medium',
          title: 'Análise de IA Concluída',
          message: 'Análise de sintomas do paciente João Silva foi concluída com recomendações',
          userId,
          patientId: 'patient-1',
          metadata: { analysisId: 'analysis-123', accuracy: 94.5 },
          read: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
        },
        {
          id: '2',
          type: 'critical_alert',
          priority: 'critical',
          title: 'Alerta Crítico',
          message: 'Possível interação medicamentosa severa detectada para Maria Santos',
          userId,
          patientId: 'patient-2',
          metadata: { drugs: ['Warfarin', 'Aspirina'], severity: 'severe' },
          read: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
        },
        {
          id: '3',
          type: 'system_status',
          priority: 'low',
          title: 'Sistema Atualizado',
          message: 'Nova versão do sistema de IA médica foi implantada com melhorias',
          userId,
          metadata: { version: '2.1.0' },
          read: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hora atrás
        },
        {
          id: '4',
          type: 'appointment_reminder',
          priority: 'medium',
          title: 'Consulta em 30 minutos',
          message: 'Consulta com Dr. Carlos Oliveira às 14:30',
          userId,
          consultationId: 'consultation-1',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutos atrás
        }
      ]

      let filtered = mockNotifications

      if (options.unreadOnly) {
        filtered = filtered.filter(n => !n.read)
      }

      if (options.priority) {
        filtered = filtered.filter(n => n.priority === options.priority)
      }

      if (options.type) {
        filtered = filtered.filter(n => n.type === options.type)
      }

      if (options.limit) {
        filtered = filtered.slice(0, options.limit)
      }

      return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      return []
    }
  }

  // Marcar notificação como lida
  static async markAsRead(notificationId: string, userId: string) {
    try {
      // Em produção, atualizaria no banco
      console.log(`Notificação ${notificationId} marcada como lida para usuário ${userId}`)
      return true
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      return false
    }
  }

  // Marcar todas as notificações como lidas
  static async markAllAsRead(userId: string) {
    try {
      console.log(`Todas as notificações do usuário ${userId} marcadas como lidas`)
      return true
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
      return false
    }
  }

  // Excluir notificação
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      console.log(`Notificação ${notificationId} excluída para usuário ${userId}`)
      return true
    } catch (error) {
      console.error('Erro ao excluir notificação:', error)
      return false
    }
  }

  // Notificações automáticas para IA
  static async notifyAIAnalysisComplete(
    userId: string,
    patientName: string,
    analysisType: string,
    results: any
  ) {
    await this.createNotification({
      type: 'ai_analysis_complete',
      priority: 'medium',
      title: `Análise ${analysisType} Concluída`,
      message: `Análise de ${analysisType.toLowerCase()} do paciente ${patientName} foi concluída`,
      userId,
      metadata: { analysisType, results }
    })
  }

  static async notifyCriticalAlert(
    userId: string,
    patientName: string,
    alertType: string,
    details: any
  ) {
    await this.createNotification({
      type: 'critical_alert',
      priority: 'critical',
      title: 'Alerta Crítico',
      message: `${alertType} crítico detectado para ${patientName}`,
      userId,
      metadata: { alertType, details }
    })
  }

  static async notifyDrugInteraction(
    userId: string,
    patientName: string,
    drugs: string[],
    severity: string
  ) {
    const priority: NotificationPriority = 
      severity === 'severe' ? 'critical' : 
      severity === 'moderate' ? 'high' : 'medium'

    await this.createNotification({
      type: 'drug_interaction_warning',
      priority,
      title: `Interação Medicamentosa ${severity}`,
      message: `Interação ${severity.toLowerCase()} detectada em ${patientName}: ${drugs.join(' + ')}`,
      userId,
      metadata: { drugs, severity }
    })
  }

  // Estatísticas de notificações
  static async getNotificationStats(userId: string) {
    const notifications = await this.getUserNotifications(userId)
    
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      critical: notifications.filter(n => n.priority === 'critical').length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // Utilitários
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  static formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `${diffMins} min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    return `${diffDays} dias atrás`
  }

  static getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  static getTypeIcon(type: NotificationType): string {
    switch (type) {
      case 'ai_analysis_complete': return '🧠'
      case 'critical_alert': return '🚨'
      case 'drug_interaction_warning': return '💊'
      case 'system_status': return '⚙️'
      case 'appointment_reminder': return '📅'
      case 'patient_update': return '👤'
      default: return '📢'
    }
  }
}
