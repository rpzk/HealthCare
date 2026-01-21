/**
 * Serviço de Confirmação Automática de Consultas
 * Envia lembretes e permite confirmação via WhatsApp
 */

import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { addHours, subHours, isBefore, isAfter, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'

export class AppointmentConfirmationService {
  /**
   * Envia lembretes automáticos para consultas do próximo dia
   * Executar via cron job: 0 18 * * * (todos os dias às 18h)
   */
  static async sendDailyReminders(): Promise<void> {
    const now = new Date()
    const tomorrow = addHours(now, 24)
    const dayAfterTomorrow = addHours(tomorrow, 24)

    logger.info(`[Confirmation] Enviando lembretes para consultas de ${format(tomorrow, 'dd/MM/yyyy')}`)

    try {
      // Buscar consultas agendadas para as próximas 24-48h
      const appointments = await prisma.consultation.findMany({
        where: {
          scheduledDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          status: 'SCHEDULED'
        },
        include: {
          patient: true,
          doctor: {
            select: {
              name: true,
              speciality: true,
            }
          }
        }
      })

      logger.info(`[Confirmation] Encontradas ${appointments.length} consultas`)

      let successCount = 0
      let errorCount = 0

      for (const appointment of appointments) {
        if (!appointment.patient?.phone) {
          logger.info(`[Confirmation] Paciente ${appointment.patient?.name} sem telefone`)
          continue
        }

        try {
          const message = this.generateReminderMessage(appointment)
          const sent = await WhatsAppService.sendMessage({
            to: appointment.patient.phone,
            message
          })

          if (sent) {
            // Registrar que lembrete foi enviado
            await prisma.notification.create({
              data: {
                userId: appointment.patientId,
                title: '🔔 Lembrete de Consulta',
                message: 'Lembrete de consulta enviado via WhatsApp',
                type: 'APPOINTMENT',
                read: false,
              }
            })
            successCount++
          } else {
            errorCount++
          }

          // Aguardar 2s entre envios (evitar rate limit)
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          logger.error(`[Confirmation] Erro ao enviar para ${appointment.patient.name}:`, error)
          errorCount++
        }
      }

      logger.info(`[Confirmation] Concluído: ${successCount} enviados, ${errorCount} erros`)
    } catch (error) {
      logger.error('[Confirmation] Erro ao enviar lembretes:', error)
      throw error
    }
  }

  /**
   * Processa confirmação via WhatsApp
   * Quando paciente responde "CONFIRMAR" ou "SIM"
   */
  static async processConfirmation(
    patientPhone: string,
    messageText: string
  ): Promise<boolean> {
    try {
      const confirmKeywords = ['confirmar', 'sim', 'ok', 'confirmo', 'confirmo sim', '1']
      const cancelKeywords = ['cancelar', 'desmarcar', 'nao', 'não', '2']

      const normalizedText = messageText.toLowerCase().trim()

      // Buscar consulta futura do paciente
      const patient = await prisma.patient.findFirst({
        where: { phone: patientPhone }
      })

      if (!patient) {
        logger.info(`[Confirmation] Paciente não encontrado: ${patientPhone}`)
        return false
      }

      const now = new Date()
      const appointment = await prisma.consultation.findFirst({
        where: {
          patientId: patient.id,
          scheduledDate: {
            gte: now
          },
          status: 'SCHEDULED'
        },
        include: {
          patient: true,
          doctor: true,
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      })

      if (!appointment) {
        await WhatsAppService.sendMessage({
          to: patientPhone,
          message: 'Não encontrei consultas agendadas para confirmar. Entre em contato com a clínica se precisar de ajuda!'
        })
        return false
      }

      // CONFIRMAR
      if (confirmKeywords.some(keyword => normalizedText.includes(keyword))) {
        await prisma.consultation.update({
          where: { id: appointment.id },
          data: { 
            status: 'SCHEDULED',
            notes: (appointment.notes || '') + '\n[WhatsApp] Paciente confirmou presença em ' + new Date().toLocaleString('pt-BR')
          }
        })

        await WhatsAppService.sendMessage({
          to: patientPhone,
          message: `✅ *Consulta Confirmada!*\n\n` +
          `📅 ${format(new Date(appointment.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n` +
          `Aguardamos você! Se precisar remarcar, entre em contato conosco.`
        })

        // Notificar recepção
        await prisma.notification.create({
          data: {
            userId: appointment.doctorId,
            title: '✅ Consulta Confirmada',
            message: `Paciente ${patient.name} confirmou consulta`,
            type: 'APPOINTMENT',
            read: false,
          }
        })

        return true
      }

      // CANCELAR/DESMARCAR
      if (cancelKeywords.some(keyword => normalizedText.includes(keyword))) {
        await prisma.consultation.update({
          where: { id: appointment.id },
          data: { status: 'CANCELLED' }
        })

        await WhatsAppService.sendMessage({
          to: patientPhone,
          message: `❌ *Consulta Desmarcada*\n\n` +
          `Sua consulta foi cancelada. Se quiser reagendar, entre em contato conosco.\n\n` +
          `📞 Telefone da clínica: (11) 99999-9999`
        })

        // Notificar recepção
        await prisma.notification.create({
          data: {
            userId: appointment.doctorId,
            title: '❌ Consulta Cancelada',
            message: `Paciente ${patient.name} cancelou consulta via WhatsApp`,
            type: 'APPOINTMENT',
            read: false,
          }
        })

        return true
      }

      // Mensagem de ajuda
      await WhatsAppService.sendMessage({
        to: patientPhone,
        message: `Para confirmar sua consulta, responda:\n\n` +
        `*1* - Confirmar\n` +
        `*2* - Cancelar\n\n` +
        `Ou entre em contato conosco.`
      })

      return false
    } catch (error) {
      logger.error('[Confirmation] Erro ao processar confirmação:', error)
      return false
    }
  }

  /**
   * Gera mensagem de lembrete personalizada
   */
  private static generateReminderMessage(appointment: any): string {
    const date = new Date(appointment.scheduledFor)
    const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR })
    const formattedTime = format(date, "HH:mm", { locale: ptBR })
    
    const doctorName = appointment.doctor?.name || 'Profissional'
    const specialty = appointment.doctor?.speciality || 'Clínico Geral'
    const patientName = appointment.patient?.name?.split(' ')[0] || 'Paciente'

    return `🏥 *Lembrete de Consulta*\n\n` +
      `Olá ${patientName}! 👋\n\n` +
      `Você tem consulta agendada:\n\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `🕐 *Horário:* ${formattedTime}\n` +
      `👨‍⚕️ *Médico:* Dr(a). ${doctorName}\n` +
      `🩺 *Especialidade:* ${specialty}\n\n` +
      `Por favor, confirme sua presença respondendo:\n\n` +
      `*1* - Confirmar\n` +
      `*2* - Cancelar\n\n` +
      `Até breve! 😊`
  }

  /**
   * Agenda próximo lembrete (para execução manual ou teste)
   */
  static async scheduleNextReminder(): Promise<void> {
    logger.info('[Confirmation] Agendando próximo lembrete...')
    
    // Em produção, isso seria configurado no cron job do servidor
    // Exemplo: 0 18 * * * (todos os dias às 18h)
    
    setTimeout(async () => {
      await this.sendDailyReminders()
      await this.scheduleNextReminder() // Re-agendar
    }, 24 * 60 * 60 * 1000) // 24 horas
  }
}
