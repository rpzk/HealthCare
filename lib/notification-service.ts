import { prisma } from '@/lib/prisma'

export interface Notification {
  id: string
  userId: string
  type: string
  priority: string
  title: string
  message: string
  read: boolean
  metadata: any
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

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface NotificationCreateData {
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  userId: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

export class NotificationService {
  static async createNotification(data: NotificationCreateData) {
    try {
      const notification = await (prisma as any).notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          metadata: data.metadata || {},
          expiresAt: data.expiresAt
        }
      })

      // TODO: Integrate with WebSocket/SSE for real-time delivery
      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  static async getUserNotifications(userId: string, filters: { unreadOnly?: boolean, limit?: number, priority?: string, type?: string } | boolean = {}): Promise<Notification[]> {
    const options = typeof filters === 'boolean' ? { unreadOnly: filters } : filters
    const where: any = { userId }
    if (options.unreadOnly) where.read = false
    if (options.priority) where.priority = options.priority
    if (options.type) where.type = options.type

    return (prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50
    })
  }

  static async deleteNotification(id: string) {
    return (prisma as any).notification.delete({
      where: { id }
    })
  }

  static async markAsRead(id: string) {
    return (prisma as any).notification.update({
      where: { id },
      data: { read: true }
    })
  }

  static async markAllAsRead(userId: string) {
    return (prisma as any).notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
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
    await this.createNotification({
      type: 'drug_interaction_warning',
      priority: 'high',
      title: 'Interação Medicamentosa',
      message: `Interação ${severity} detectada entre: ${drugs.join(', ')}`,
      userId,
      metadata: { drugs, severity }
    })
  }

  // Integração WhatsApp
  static async sendWhatsApp(phone: string, message: string) {
    const provider = process.env.WHATSAPP_PROVIDER || 'console' // 'console', 'twilio', 'webhook'
    
    try {
      if (provider === 'console') {
        console.log(`📱 [WhatsApp Mock] Para: ${phone} | Msg: "${message}"`)
        await new Promise(resolve => setTimeout(resolve, 500))
        return true
      }

      if (provider === 'webhook') {
        // Integração genérica (ex: Evolution API, WPPConnect, Z-API)
        const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL
        const apiKey = process.env.WHATSAPP_API_KEY
        
        if (!webhookUrl) throw new Error('WHATSAPP_WEBHOOK_URL não configurada')

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
          },
          body: JSON.stringify({
            number: phone.replace(/\D/g, ''), // Remove formatação
            message: message
          })
        })

        if (!response.ok) {
          throw new Error(`Erro API WhatsApp: ${response.statusText}`)
        }
        return true
      }

      // TODO: Adicionar Twilio/Zenvia aqui
      console.warn(`⚠️ Provedor WhatsApp '${provider}' não implementado.`)
      return false

    } catch (error) {
      console.error('❌ [WhatsApp] Falha no envio:', error)
      // Não lançar erro para não quebrar o fluxo principal
      return false
    }
  }

  static async sendAppointmentReminder(patientName: string, phone: string, date: Date) {
    const formattedDate = date.toLocaleString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    const message = `Olá ${patientName}, lembrete de sua consulta na HealthCare para ${formattedDate}. Responda SIM para confirmar.`
    
    return this.sendWhatsApp(phone, message)
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
    // Garantir que date é um objeto Date válido
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida'
    }
    
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
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
