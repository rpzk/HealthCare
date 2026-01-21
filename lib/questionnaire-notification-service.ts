import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Serviço para gerenciar notificações de questionários
 * Cria notificações automáticas quando:
 * - Um questionário é enviado
 * - Um questionário é respondido
 * - Um questionário expira
 * - Análise IA está pronta
 */
export class QuestionnaireNotificationService {
  /**
   * Notificar quando um questionário é enviado
   */
  static async notifyQuestionnaireSent(doctorId: string, patientName: string, questionnaireName: string, questionnaireId: string) {
    try {
      await prisma.notification.create({
        data: {
          userId: doctorId,
          type: 'QUESTIONNAIRE_SENT',
          title: `📬 Questionário Enviado`,
          message: `Você enviou o questionário "${questionnaireName}" para ${patientName}`,
          metadata: {
            patientName,
            questionnaireName,
            questionnaireId,
          } as any,
        },
      })
    } catch (error) {
      logger.error('Erro ao criar notificação de envio:', error)
    }
  }

  /**
   * Notificar quando um questionário é respondido
   */
  static async notifyQuestionnaireCompleted(
    doctorId: string,
    patientName: string,
    questionnaireName: string,
    questionnaireId: string,
    patientId: string
  ) {
    try {
      await prisma.notification.create({
        data: {
          userId: doctorId,
          type: 'QUESTIONNAIRE_COMPLETED',
          title: `✅ Questionário Respondido`,
          message: `${patientName} respondeu o questionário "${questionnaireName}"`,
          metadata: {
            patientName,
            questionnaireName,
            questionnaireId,
            patientId,
            actionUrl: `/patients/${patientId}?tab=questionnaires&id=${questionnaireId}`,
          } as any,
        },
      })
    } catch (error) {
      logger.error('Erro ao criar notificação de conclusão:', error)
    }
  }

  /**
   * Notificar quando um questionário expira
   */
  static async notifyQuestionnaireExpired(
    doctorId: string,
    patientName: string,
    questionnaireName: string,
    questionnaireId: string,
    patientId: string
  ) {
    try {
      await prisma.notification.create({
        data: {
          userId: doctorId,
          type: 'QUESTIONNAIRE_EXPIRED',
          title: `⏱️ Questionário Expirado`,
          message: `O prazo para ${patientName} responder "${questionnaireName}" expirou`,
          metadata: {
            patientName,
            questionnaireName,
            questionnaireId,
            patientId,
            actionUrl: `/patients/${patientId}?tab=questionnaires`,
          } as any,
        },
      })
    } catch (error) {
      logger.error('Erro ao criar notificação de expiração:', error)
    }
  }

  /**
   * Notificar quando análise IA está pronta
   */
  static async notifyAIAnalysisReady(
    doctorId: string,
    patientName: string,
    questionnaireName: string,
    questionnaireId: string,
    patientId: string,
    hasConcerns: boolean = false
  ) {
    try {
      const title = hasConcerns 
        ? `⚠️ Análise IA Pronta - Com Preocupações`
        : `🧠 Análise IA Disponível`

      const message = hasConcerns
        ? `A análise do questionário de ${patientName} identificou preocupações que requerem atenção`
        : `A análise automática do questionário de ${patientName} está pronta para revisão`

      await prisma.notification.create({
        data: {
          userId: doctorId,
          type: 'AI_ANALYSIS_READY',
          title,
          message,
          metadata: {
            patientName,
            questionnaireName,
            questionnaireId,
            patientId,
            hasConcerns,
            actionUrl: `/admin/questionnaire-analytics?tab=insights&questionnaireId=${questionnaireId}`,
          } as any,
        },
      })
    } catch (error) {
      logger.error('Erro ao criar notificação de análise IA:', error)
    }
  }

  /**
   * Enviar notificação em lote para múltiplos profissionais
   */
  static async notifyMultiple(
    doctorIds: string[],
    type: string,
    title: string,
    message: string,
    metadata: any = {}
  ) {
    try {
      await Promise.all(
        doctorIds.map(doctorId =>
          prisma.notification.create({
            data: {
              userId: doctorId,
              type,
              title,
              message,
              metadata: metadata as any,
            },
          })
        )
      )
    } catch (error) {
      logger.error('Erro ao criar notificações em lote:', error)
    }
  }

  /**
   * Limpar notificações antigas (mais de 30 dias)
   */
  static async cleanupOldNotifications(days: number = 30) {
    try {
      const date = new Date()
      date.setDate(date.getDate() - days)

      const result = await prisma.notification.deleteMany({
        where: {
          type: {
            in: [
              'QUESTIONNAIRE_SENT',
              'QUESTIONNAIRE_COMPLETED',
              'QUESTIONNAIRE_EXPIRED',
              'AI_ANALYSIS_READY',
            ],
          },
          createdAt: {
            lt: date,
          },
          read: true,
        },
      })

      logger.info(`Notificações antigas limpas: ${result.count}`)
      return result.count
    } catch (error) {
      logger.error('Erro ao limpar notificações antigas:', error)
      return 0
    }
  }
}
