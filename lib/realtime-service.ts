/**
 * Serviço de Notificações em Tempo Real (WebSocket/SSE)
 * 
 * Implementa Server-Sent Events para notificações em tempo real
 * como alternativa mais simples ao WebSocket.
 * 
 * Eventos suportados:
 * - appointment.created - Nova consulta agendada
 * - appointment.updated - Consulta atualizada
 * - appointment.cancelled - Consulta cancelada
 * - patient.checkin - Paciente fez check-in
 * - prescription.created - Nova prescrição emitida
 * - medical_record.updated - Prontuário atualizado
 * - notification.new - Nova notificação do sistema
 * - vital_signs.alert - Alerta de sinais vitais críticos
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import Redis from 'ioredis'

// ============ TIPOS ============

export type EventType =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'appointment.reminder'
  | 'patient.checkin'
  | 'patient.waiting'
  | 'prescription.created'
  | 'prescription.signed'
  | 'medical_record.updated'
  | 'exam.result'
  | 'notification.new'
  | 'vital_signs.alert'
  | 'queue.updated'

export interface RealtimeEvent {
  type: EventType
  payload: Record<string, unknown>
  userId?: string       // Destinatário específico (se aplicável)
  role?: string         // Destinatário por role (DOCTOR, RECEPTIONIST, etc.)
  patientId?: string    // Relacionado a um paciente específico
  timestamp: Date
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface Subscriber {
  id: string
  userId: string
  role?: string
  callback: (event: RealtimeEvent) => void
  filters?: {
    types?: EventType[]
    patientId?: string
  }
}

// ============ SERVIÇO ============

class RealtimeServiceClass {
  private subscribers: Map<string, Subscriber> = new Map()
  private redis: Redis | null = null
  private pubsub: Redis | null = null
  private isInitialized = false
  private readonly CHANNEL = 'healthcare:realtime'

  /**
   * Inicializa conexão com Redis para pub/sub distribuído
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const redisHost = process.env.REDIS_HOST || 'localhost'
      const redisPort = parseInt(process.env.REDIS_PORT || '6379')

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null
          return Math.min(times * 100, 3000)
        }
      })

      this.pubsub = new Redis({
        host: redisHost,
        port: redisPort
      })

      // Subscriber para eventos de outras instâncias
      await this.pubsub.subscribe(this.CHANNEL)
      this.pubsub.on('message', (channel, message) => {
        if (channel === this.CHANNEL) {
          try {
            const event = JSON.parse(message) as RealtimeEvent
            this.notifyLocalSubscribers(event)
          } catch (error) {
            logger.error('[Realtime] Erro ao processar mensagem pub/sub:', error)
          }
        }
      })

      this.isInitialized = true
      logger.info('[Realtime] Serviço inicializado com Redis pub/sub')
    } catch (error) {
      logger.warn('[Realtime] Redis não disponível, usando modo local:', error)
      this.isInitialized = true
    }
  }

  /**
   * Registra um subscriber para eventos
   */
  subscribe(
    userId: string,
    callback: (event: RealtimeEvent) => void,
    options?: {
      role?: string
      types?: EventType[]
      patientId?: string
    }
  ): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    this.subscribers.set(id, {
      id,
      userId,
      role: options?.role,
      callback,
      filters: {
        types: options?.types,
        patientId: options?.patientId
      }
    })

    logger.info(`[Realtime] Novo subscriber: ${id} (userId: ${userId})`)
    return id
  }

  /**
   * Remove um subscriber
   */
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId)
    logger.info(`[Realtime] Subscriber removido: ${subscriptionId}`)
  }

  /**
   * Publica um evento para todos os subscribers relevantes
   */
  async publish(event: Omit<RealtimeEvent, 'timestamp'>): Promise<void> {
    const fullEvent: RealtimeEvent = {
      ...event,
      timestamp: new Date()
    }

    // Publicar via Redis para outras instâncias
    if (this.redis) {
      try {
        await this.redis.publish(this.CHANNEL, JSON.stringify(fullEvent))
      } catch (error) {
        logger.error('[Realtime] Erro ao publicar no Redis:', error)
      }
    }

    // Notificar subscribers locais
    this.notifyLocalSubscribers(fullEvent)

    // Persistir notificação importante no banco
    if (event.priority === 'high' || event.priority === 'urgent') {
      await this.persistNotification(fullEvent)
    }
  }

  /**
   * Notifica subscribers locais
   */
  private notifyLocalSubscribers(event: RealtimeEvent): void {
    for (const subscriber of this.subscribers.values()) {
      // Filtrar por destinatário específico
      if (event.userId && event.userId !== subscriber.userId) {
        continue
      }

      // Filtrar por role
      if (event.role && subscriber.role && event.role !== subscriber.role) {
        continue
      }

      // Filtrar por tipos de evento
      if (subscriber.filters?.types && !subscriber.filters.types.includes(event.type)) {
        continue
      }

      // Filtrar por paciente
      if (subscriber.filters?.patientId && event.patientId !== subscriber.filters.patientId) {
        continue
      }

      // Notificar
      try {
        subscriber.callback(event)
      } catch (error) {
        logger.error(`[Realtime] Erro ao notificar subscriber ${subscriber.id}:`, error)
      }
    }
  }

  /**
   * Persiste notificação importante no banco
   */
  private async persistNotification(event: RealtimeEvent): Promise<void> {
    if (!event.userId) return

    try {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          title: this.getEventTitle(event.type),
          message: JSON.stringify(event.payload),
          type: this.mapEventToNotificationType(event.type),
          priority: event.priority === 'urgent' ? 'HIGH' : 'NORMAL'
        }
      })
    } catch (error) {
      logger.error('[Realtime] Erro ao persistir notificação:', error)
    }
  }

  /**
   * Mapeia tipo de evento para título
   */
  private getEventTitle(type: EventType): string {
    const titles: Record<EventType, string> = {
      'appointment.created': 'Nova consulta agendada',
      'appointment.updated': 'Consulta atualizada',
      'appointment.cancelled': 'Consulta cancelada',
      'appointment.reminder': 'Lembrete de consulta',
      'patient.checkin': 'Paciente fez check-in',
      'patient.waiting': 'Paciente aguardando',
      'prescription.created': 'Nova prescrição',
      'prescription.signed': 'Prescrição assinada',
      'medical_record.updated': 'Prontuário atualizado',
      'exam.result': 'Resultado de exame disponível',
      'notification.new': 'Nova notificação',
      'vital_signs.alert': 'Alerta de sinais vitais',
      'queue.updated': 'Fila de atendimento atualizada'
    }
    return titles[type]
  }

  /**
   * Mapeia tipo de evento para tipo de notificação
   */
  private mapEventToNotificationType(type: EventType): string {
    if (type.startsWith('appointment.')) return 'APPOINTMENT'
    if (type.startsWith('patient.')) return 'PATIENT'
    if (type.startsWith('prescription.')) return 'PRESCRIPTION'
    if (type.startsWith('exam.')) return 'EXAM'
    if (type === 'vital_signs.alert') return 'ALERT'
    return 'SYSTEM'
  }

  // ============ MÉTODOS DE CONVENIÊNCIA ============

  /**
   * Notifica sobre nova consulta agendada
   */
  async notifyAppointmentCreated(
    appointmentId: string,
    patientId: string,
    doctorId: string,
    scheduledDate: Date
  ): Promise<void> {
    await this.publish({
      type: 'appointment.created',
      payload: {
        appointmentId,
        scheduledDate: scheduledDate.toISOString()
      },
      patientId,
      userId: doctorId,
      role: 'RECEPTIONIST',
      priority: 'normal'
    })
  }

  /**
   * Notifica sobre check-in do paciente
   */
  async notifyPatientCheckin(
    patientId: string,
    patientName: string,
    appointmentId: string,
    doctorId: string
  ): Promise<void> {
    await this.publish({
      type: 'patient.checkin',
      payload: {
        patientId,
        patientName,
        appointmentId,
        checkinTime: new Date().toISOString()
      },
      userId: doctorId,
      role: 'DOCTOR',
      priority: 'high'
    })
  }

  /**
   * Notifica sobre alerta de sinais vitais
   */
  async notifyVitalSignsAlert(
    patientId: string,
    patientName: string,
    alertType: string,
    value: number,
    doctorId: string
  ): Promise<void> {
    await this.publish({
      type: 'vital_signs.alert',
      payload: {
        patientId,
        patientName,
        alertType,
        value,
        message: `${alertType}: ${value} - Valores fora do normal`
      },
      userId: doctorId,
      patientId,
      priority: 'urgent'
    })
  }

  /**
   * Notifica sobre atualização na fila
   */
  async notifyQueueUpdate(
    roomId: string,
    queuePosition: number,
    estimatedWait: number
  ): Promise<void> {
    await this.publish({
      type: 'queue.updated',
      payload: {
        roomId,
        queuePosition,
        estimatedWait
      },
      role: 'RECEPTIONIST',
      priority: 'normal'
    })
  }

  /**
   * Notifica sobre resultado de exame
   */
  async notifyExamResult(
    examId: string,
    patientId: string,
    examType: string,
    doctorId: string
  ): Promise<void> {
    await this.publish({
      type: 'exam.result',
      payload: {
        examId,
        examType
      },
      userId: doctorId,
      patientId,
      priority: 'high'
    })
  }

  /**
   * Retorna estatísticas do serviço
   */
  getStats(): {
    subscribersCount: number
    isRedisConnected: boolean
  } {
    return {
      subscribersCount: this.subscribers.size,
      isRedisConnected: this.redis?.status === 'ready'
    }
  }
}

// Singleton
export const RealtimeService = new RealtimeServiceClass()

// Auto-inicialização
RealtimeService.initialize().catch(err => {
  logger.error('[Realtime] Erro na inicialização:', err)
})
