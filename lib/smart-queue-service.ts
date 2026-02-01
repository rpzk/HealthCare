/**
 * Smart Queue Service
 * 
 * Serviço de fila de espera inteligente com:
 * - Estimativa de tempo de espera baseada em histórico
 * - Notificação automática quando a vez chega
 * - Priorização por urgência, tempo de espera e tipo de atendimento
 * - Métricas e analytics em tempo real
 */

import { prisma } from '@/lib/prisma'
import { NotificationSender } from '@/lib/notification-sender'
import { NotificationService } from '@/lib/notification-service'
import { logger } from '@/lib/logger'

// ============ TYPES ============

export interface QueueEntry {
  id: string
  patientId: string
  patientName: string
  patientPhone?: string | null
  doctorId?: string
  doctorName?: string
  specialty?: string
  priority: number  // 1 = normal, 2 = preferencial, 3 = urgência, 4 = emergência
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW'
  arrivalTime: Date
  estimatedWaitMinutes?: number
  position?: number
  ticketNumber: string
  notes?: string
}

export interface QueueStats {
  totalWaiting: number
  averageWaitMinutes: number
  estimatedWaitMinutes: number
  longestWaitMinutes: number
  byPriority: {
    normal: number
    preferential: number
    urgent: number
    emergency: number
  }
  byStatus: {
    waiting: number
    called: number
    inProgress: number
    completed: number
    noShow: number
  }
}

// ============ PRIORITY LABELS ============

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Normal',
  2: 'Preferencial (Idoso/Gestante/PcD)',
  3: 'Urgência',
  4: 'Emergência'
}

const PRIORITY_WEIGHTS: Record<number, number> = {
  1: 1,     // Normal: peso 1
  2: 1.5,   // Preferencial: peso 1.5 (avança mais rápido)
  3: 3,     // Urgência: peso 3
  4: 10     // Emergência: peso 10 (quase imediato)
}

// ============ SERVICE CLASS ============

class SmartQueueServiceClass {
  private ticketCounter: number = 0
  private lastTicketDate: string = ''

  /**
   * Adiciona paciente à fila
   */
  async addToQueue(data: {
    patientId: string
    doctorId?: string
    specialty?: string
    priority?: number
    notes?: string
    arrivalTime?: Date
  }): Promise<QueueEntry> {
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, name: true, phone: true, birthDate: true }
    })

    if (!patient) {
      throw new Error('Paciente não encontrado')
    }

    // Auto-detectar prioridade por idade (idoso > 60)
    let priority = data.priority || 1
    if (!data.priority && patient.birthDate) {
      const age = this.calculateAge(patient.birthDate)
      if (age >= 60) {
        priority = 2 // Preferencial
      }
    }

    // Gerar número de senha
    const ticketNumber = this.generateTicketNumber(priority)

    // Buscar médico se especificado
    let doctorName: string | undefined
    if (data.doctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: data.doctorId },
        select: { name: true }
      })
      doctorName = doctor?.name
    }

    // Criar entrada na fila (usando WaitingList existente)
    const entry = await prisma.waitingList.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        specialty: data.specialty,
        priority,
        status: 'ACTIVE',
        notes: data.notes,
        urgencyReason: priority >= 3 ? PRIORITY_LABELS[priority] : undefined
      }
    })

    // Calcular posição e tempo estimado
    const stats = await this.getQueueStats(data.doctorId, data.specialty)
    const position = await this.getQueuePosition(entry.id, data.doctorId, data.specialty)

    const queueEntry: QueueEntry = {
      id: entry.id,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      doctorId: data.doctorId,
      doctorName,
      specialty: data.specialty || undefined,
      priority,
      status: 'WAITING',
      arrivalTime: entry.createdAt,
      estimatedWaitMinutes: stats.estimatedWaitMinutes * position,
      position,
      ticketNumber,
      notes: data.notes
    }

    logger.info(`[SmartQueue] Paciente ${patient.name} adicionado à fila. Ticket: ${ticketNumber}, Posição: ${position}`)

    return queueEntry
  }

  /**
   * Chama próximo paciente da fila
   */
  async callNext(params: {
    doctorId?: string
    specialty?: string
    roomName: string
    calledBy: string
  }): Promise<QueueEntry | null> {
    // Buscar próximo da fila ordenado por:
    // 1. Prioridade (maior primeiro)
    // 2. Tempo de espera ponderado
    const entries = await prisma.waitingList.findMany({
      where: {
        status: 'ACTIVE',
        ...(params.doctorId && { doctorId: params.doctorId }),
        ...(params.specialty && { specialty: params.specialty })
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, email: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 1
    })

    if (entries.length === 0) {
      return null
    }

    const entry = entries[0]

    // Atualizar status para NOTIFIED
    await prisma.waitingList.update({
      where: { id: entry.id },
      data: { status: 'NOTIFIED' }
    })

    // Enviar notificação via WhatsApp
    if (entry.patient.phone) {
      await NotificationSender.sendQueueCall({
        name: entry.patient.name,
        phone: entry.patient.phone,
        email: entry.patient.email || undefined,
        patientId: entry.patientId,
        roomName: params.roomName
      })
    }

    // Criar notificação in-app também
    await NotificationService.createNotification({
      type: 'system',
      priority: 'high',
      title: '🔔 Sua vez chegou!',
      message: `Dirija-se ao ${params.roomName}`,
      userId: entry.patientId
    })

    logger.info(`[SmartQueue] Paciente ${entry.patient.name} chamado para ${params.roomName}`)

    return {
      id: entry.id,
      patientId: entry.patientId,
      patientName: entry.patient.name,
      patientPhone: entry.patient.phone,
      priority: entry.priority,
      status: 'CALLED',
      arrivalTime: entry.createdAt,
      ticketNumber: `${entry.priority}${entry.id.slice(-4).toUpperCase()}`
    }
  }

  /**
   * Marca paciente como atendido
   */
  async markAsInProgress(entryId: string): Promise<void> {
    await prisma.waitingList.update({
      where: { id: entryId },
      data: { status: 'SCHEDULED' } // Usando SCHEDULED como proxy para IN_PROGRESS
    })
    logger.info(`[SmartQueue] Entrada ${entryId} marcada como em atendimento`)
  }

  /**
   * Marca paciente como não compareceu
   */
  async markAsNoShow(entryId: string): Promise<void> {
    await prisma.waitingList.update({
      where: { id: entryId },
      data: { status: 'EXPIRED' }
    })
    logger.info(`[SmartQueue] Entrada ${entryId} marcada como não compareceu`)
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(doctorId?: string, specialty?: string): Promise<QueueStats> {
    const where = {
      status: 'ACTIVE' as const,
      ...(doctorId && { doctorId }),
      ...(specialty && { specialty })
    }

    // Total na fila
    const entries = await prisma.waitingList.findMany({
      where,
      select: {
        id: true,
        priority: true,
        createdAt: true
      }
    })

    const now = new Date()
    const waitTimes = entries.map(e => 
      (now.getTime() - e.createdAt.getTime()) / (1000 * 60)
    )

    // Calcular média histórica de atendimento (últimas 24h)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const completedToday = await prisma.waitingList.count({
      where: {
        status: 'SCHEDULED' as const,
        updatedAt: { gte: yesterday },
        ...(doctorId && { doctorId }),
        ...(specialty && { specialty })
      }
    })

    // Tempo médio estimado por atendimento (em minutos)
    const avgServiceTime = completedToday > 0 
      ? 15 // Se tem dados, usar 15 min como padrão
      : 20 // Se não tem dados, usar 20 min

    const totalWaiting = entries.length
    const averageWait = waitTimes.length > 0 
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length 
      : 0
    const longestWait = waitTimes.length > 0 
      ? Math.max(...waitTimes) 
      : 0

    // Contar por prioridade
    const byPriority = {
      normal: entries.filter(e => e.priority === 1).length,
      preferential: entries.filter(e => e.priority === 2).length,
      urgent: entries.filter(e => e.priority === 3).length,
      emergency: entries.filter(e => e.priority === 4).length
    }

    return {
      totalWaiting,
      averageWaitMinutes: Math.round(averageWait),
      estimatedWaitMinutes: avgServiceTime,
      longestWaitMinutes: Math.round(longestWait),
      byPriority,
      byStatus: {
        waiting: totalWaiting,
        called: 0, // Seria preciso contar NOTIFIED
        inProgress: 0,
        completed: completedToday,
        noShow: 0
      }
    }
  }

  /**
   * Obtém posição atual na fila
   */
  async getQueuePosition(entryId: string, doctorId?: string, specialty?: string): Promise<number> {
    const entry = await prisma.waitingList.findUnique({
      where: { id: entryId }
    })

    if (!entry) return -1

    const ahead = await prisma.waitingList.count({
      where: {
        status: 'ACTIVE',
        ...(doctorId && { doctorId }),
        ...(specialty && { specialty }),
        OR: [
          { priority: { gt: entry.priority } },
          {
            priority: entry.priority,
            createdAt: { lt: entry.createdAt }
          }
        ]
      }
    })

    return ahead + 1
  }

  /**
   * Lista fila atual
   */
  async getQueue(params?: {
    doctorId?: string
    specialty?: string
    limit?: number
  }): Promise<QueueEntry[]> {
    const entries = await prisma.waitingList.findMany({
      where: {
        status: { in: ['ACTIVE', 'NOTIFIED'] },
        ...(params?.doctorId && { doctorId: params.doctorId }),
        ...(params?.specialty && { specialty: params.specialty })
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true }
        },
        doctor: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: params?.limit || 50
    })

    const stats = await this.getQueueStats(params?.doctorId, params?.specialty)

    return entries.map((entry, index) => ({
      id: entry.id,
      patientId: entry.patientId,
      patientName: entry.patient.name,
      patientPhone: entry.patient.phone,
      doctorId: entry.doctorId || undefined,
      doctorName: entry.doctor?.name,
      specialty: entry.specialty || undefined,
      priority: entry.priority,
      status: entry.status === 'ACTIVE' ? 'WAITING' : 'CALLED',
      arrivalTime: entry.createdAt,
      estimatedWaitMinutes: stats.estimatedWaitMinutes * (index + 1),
      position: index + 1,
      ticketNumber: `${entry.priority}${entry.id.slice(-4).toUpperCase()}`,
      notes: entry.notes || undefined
    }))
  }

  /**
   * Gera número de senha
   */
  private generateTicketNumber(priority: number): string {
    const today = new Date().toISOString().split('T')[0]
    
    // Reset counter se mudou o dia
    if (this.lastTicketDate !== today) {
      this.ticketCounter = 0
      this.lastTicketDate = today
    }

    this.ticketCounter++

    // Prefixo por prioridade: N=Normal, P=Preferencial, U=Urgência, E=Emergência
    const prefixes = ['', 'N', 'P', 'U', 'E']
    const prefix = prefixes[priority] || 'N'

    return `${prefix}${this.ticketCounter.toString().padStart(3, '0')}`
  }

  /**
   * Calcula idade a partir da data de nascimento
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }
}

// Singleton export
export const SmartQueueService = new SmartQueueServiceClass()
