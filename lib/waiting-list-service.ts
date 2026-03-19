/**
 * Serviço de Fila de Espera
 * Gerencia lista de pacientes aguardando vaga para consulta
 */

import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { addDays } from 'date-fns'
import { logger } from '@/lib/logger'

export class WaitingListService {
  /**
   * Adiciona paciente à fila de espera
   */
  static async addToWaitingList(data: {
    patientId: string
    doctorId?: string
    specialty?: string
    preferredDays?: string[]
    preferredTimes?: string[]
    priority?: number
    urgencyReason?: string
    notes?: string
    expiresAt?: Date
  }) {
    try {
      // Verificar se já está na fila
      const existing = await prisma.waitingList.findFirst({
        where: {
          patientId: data.patientId,
          status: 'ACTIVE',
          doctorId: data.doctorId,
        }
      })

      if (existing) {
        throw new Error('Paciente já está na fila de espera')
      }

      const waitingList = await prisma.waitingList.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          specialty: data.specialty,
          preferredDays: data.preferredDays || [],
          preferredTimes: data.preferredTimes || [],
          priority: data.priority || 5,
          urgencyReason: data.urgencyReason,
          notes: data.notes,
          expiresAt: data.expiresAt || addDays(new Date(), 60), // 60 dias padrão
          status: 'ACTIVE',
        },
        include: {
          patient: true,
          doctor: true,
        }
      })

      // Notificar profissional responsável (ou um admin real, se não houver médico específico)
      const fallbackAdmin = !data.doctorId
        ? await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
        : null

      const notifyUserId = data.doctorId || fallbackAdmin?.id

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            title: '📋 Novo paciente na fila de espera',
            message: `${waitingList.patient.name} entrou na fila${data.urgencyReason ? ` - ${data.urgencyReason}` : ''}`,
            type: 'WAITING_LIST',
            read: false,
            metadata: {
              waitingListId: waitingList.id,
              patientId: waitingList.patientId,
              doctorId: waitingList.doctorId,
              actionUrl: `/appointments/waiting-list/${waitingList.id}`,
            },
          },
        })
      }

      return waitingList
    } catch (error) {
      logger.error('[WaitingList] Error adding:', error)
      throw error
    }
  }

  /**
   * Notifica paciente sobre vaga disponível
   */
  static async notifyAvailableSlot(
    waitingListId: string,
    availableDate: Date
  ): Promise<boolean> {
    try {
      const item = await prisma.waitingList.findUnique({
        where: { id: waitingListId },
        include: {
          patient: true,
          doctor: true,
        }
      })

      if (!item || item.status !== 'ACTIVE') {
        return false
      }

      if (!item.patient.phone) {
        logger.info('[WaitingList] Patient has no phone')
        return false
      }

      // Enviar WhatsApp
      const message = `🏥 *Vaga Disponível!*\n\n` +
        `Olá ${item.patient.name}! 👋\n\n` +
        `Temos uma vaga disponível:\n\n` +
        `📅 *Data:* ${availableDate.toLocaleDateString('pt-BR')}\n` +
        `🕐 *Horário:* ${availableDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
        `👨‍⚕️ *Médico:* Dr(a). ${item.doctor?.name || 'A definir'}\n\n` +
        `Para agendar, entre em contato:\n` +
        `📞 (11) 99999-9999\n\n` +
        `*Responda rápido, a vaga é por ordem de chegada!* ⏰`

      const sent = await WhatsAppService.sendMessage({ to: item.patient.phone, message })

      if (sent) {
        // Atualizar status
        await prisma.waitingList.update({
          where: { id: waitingListId },
          data: {
            status: 'NOTIFIED',
            lastNotifiedAt: new Date(),
            notificationsSent: item.notificationsSent + 1,
          }
        })

        return true
      }

      return false
    } catch (error) {
      logger.error('[WaitingList] Error notifying:', error)
      return false
    }
  }

  /**
   * Quando consulta é cancelada, notifica próximos da fila
   */
  static async processAppointmentCancellation(
    appointmentId: string
  ): Promise<void> {
    try {
      const appointment = await prisma.consultation.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: true,
        }
      })

      if (!appointment) return

      // Buscar pacientes na fila para este médico
      const waitingPatients = await prisma.waitingList.findMany({
        where: {
          OR: [
            { doctorId: appointment.doctorId },
            { 
              doctorId: null,
              specialty: appointment.doctor.speciality || undefined,
            }
          ],
          status: 'ACTIVE',
        },
        orderBy: [
          { priority: 'desc' }, // Mais urgentes primeiro
          { createdAt: 'asc' }, // Mais antigos primeiro
        ],
        take: 3, // Notificar top 3
        include: {
          patient: true,
        }
      })

      logger.info(`[WaitingList] Found ${waitingPatients.length} waiting patients`)

      for (const item of waitingPatients) {
        await this.notifyAvailableSlot(item.id, appointment.scheduledDate)
        
        // Aguardar 5s entre envios
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } catch (error) {
      logger.error('[WaitingList] Error processing cancellation:', error)
    }
  }

  /**
   * Remove da fila quando consulta é agendada
   */
  static async markAsScheduled(
    waitingListId: string,
    appointmentId: string
  ): Promise<void> {
    await prisma.waitingList.update({
      where: { id: waitingListId },
      data: {
        status: 'SCHEDULED',
        appointmentId,
      }
    })
  }

  /**
   * Limpa filas expiradas (executar diariamente via cron)
   */
  static async cleanupExpired(): Promise<number> {
    const result = await prisma.waitingList.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'EXPIRED'
      }
    })

    logger.info(`[WaitingList] Expired ${result.count} items`)
    return result.count
  }

  /**
   * Busca posição do paciente na fila
   */
  static async getPatientPosition(waitingListId: string): Promise<number> {
    const item = await prisma.waitingList.findUnique({
      where: { id: waitingListId }
    })

    if (!item) return -1

      const position = await prisma.waitingList.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { 
              doctorId: item.doctorId,
              priority: { gt: item.priority }
            },
            {
              doctorId: item.doctorId,
              priority: item.priority,
              createdAt: { lt: item.createdAt }
            },
            { 
              specialty: item.specialty,
              priority: { gt: item.priority }
            },
            {
              specialty: item.specialty,
              priority: item.priority,
              createdAt: { lt: item.createdAt }
            }
          ]
        }
      })
      
      return position + 1 // Posição começa em 1
  }
}
