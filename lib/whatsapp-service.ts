import axios from 'axios'

interface WhatsAppMessage {
  to: string // Phone number in format: 5511999999999
  message: string
  mediaUrl?: string
}

interface WhatsAppConfig {
  apiUrl: string
  apiKey: string
  instanceId: string
}

/**
 * WhatsApp Integration Service
 * 
 * Supports multiple providers:
 * - Evolution API (https://evolution-api.com/) - Open source, self-hosted
 * - Twilio (https://www.twilio.com/)
 * - Zenvia (https://www.zenvia.com/)
 * 
 * Configure in .env:
 * WHATSAPP_PROVIDER=evolution|twilio|zenvia
 * WHATSAPP_API_URL=your_api_url
 * WHATSAPP_API_KEY=your_api_key
 * WHATSAPP_INSTANCE_ID=your_instance_id
 */
import { SystemSettingsService } from './system-settings-service'
import { logger } from '@/lib/logger'

export class WhatsAppService {
  private static async getConfig(): Promise<WhatsAppConfig> {
    return await SystemSettingsService.getWhatsAppConfig() as WhatsAppConfig
  }

  private static async getProvider(): Promise<string> {
    return await SystemSettingsService.get('WHATSAPP_PROVIDER', 'evolution') || 'evolution'
  }

  static async isConfigured(): Promise<boolean> {
    const config = await this.getConfig()
    return !!(config.apiUrl && config.apiKey)
  }

  /**
   * Send a text message via WhatsApp
   */
  static async sendMessage(data: WhatsAppMessage): Promise<boolean> {
    if (!(await this.isConfigured())) {
      logger.warn('WhatsApp not configured. Message not sent:', data.message)
      return false
    }

    try {
      const provider = await this.getProvider()
      switch (provider) {
        case 'evolution':
          return await this.sendViaEvolution(data)
        case 'twilio':
          return await this.sendViaTwilio(data)
        case 'zenvia':
          return await this.sendViaZenvia(data)
        default:
          logger.error('Unknown WhatsApp provider:', provider)
          return false
      }
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error)
      return false
    }
  }

  /**
   * Send appointment confirmation
   */
  static async sendAppointmentConfirmation(
    phoneNumber: string,
    patientName: string,
    doctorName: string,
    date: Date
  ): Promise<boolean> {
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(date)

    const message = `🏥 *Confirmação de Consulta*

Olá, ${patientName}!

Sua consulta foi agendada com sucesso:

👨‍⚕️ Profissional: ${doctorName}
📅 Data/Hora: ${formattedDate}

Por favor, chegue com 15 minutos de antecedência.

Para cancelar ou reagendar, entre em contato conosco.

_Mensagem automática - HealthCare System_`

    return await this.sendMessage({
      to: phoneNumber,
      message
    })
  }

  /**
   * Send appointment reminder (24h before)
   */
  static async sendAppointmentReminder(
    phoneNumber: string,
    patientName: string,
    doctorName: string,
    date: Date
  ): Promise<boolean> {
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(date)

    const message = `🔔 *Lembrete de Consulta*

Olá, ${patientName}!

Lembramos que você tem uma consulta agendada:

👨‍⚕️ Profissional: ${doctorName}
📅 Data/Hora: ${formattedDate}

Não esqueça de trazer seus documentos e exames anteriores.

_Mensagem automática - HealthCare System_`

    return await this.sendMessage({
      to: phoneNumber,
      message
    })
  }

  /**
   * Send exam results notification
   */
  static async sendExamResultsReady(
    phoneNumber: string,
    patientName: string,
    examType: string
  ): Promise<boolean> {
    const message = `📋 *Resultados Disponíveis*

Olá, ${patientName}!

Os resultados do seu exame estão prontos:

🔬 Exame: ${examType}

Acesse o portal do paciente para visualizar ou agende uma consulta para discutir os resultados.

_Mensagem automática - HealthCare System_`

    return await this.sendMessage({
      to: phoneNumber,
      message
    })
  }

  // Provider-specific implementations

  private static async sendViaEvolution(data: WhatsAppMessage): Promise<boolean> {
    const config = await this.getConfig()
    const response = await axios.post(
      `${config.apiUrl}/message/sendText/${config.instanceId}`,
      {
        number: data.to,
        text: data.message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.apiKey
        }
      }
    )

    return response.status === 200
  }

  private static async sendViaTwilio(data: WhatsAppMessage): Promise<boolean> {
    const config = await this.getConfig()
    // Twilio uses HTTP Basic Auth with Account SID and Auth Token
    const accountSid = config.instanceId
    const authToken = config.apiKey
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || ''}`,
        To: `whatsapp:${data.to}`,
        Body: data.message
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    )

    return response.status === 201
  }

  private static async sendViaZenvia(data: WhatsAppMessage): Promise<boolean> {
    const config = await this.getConfig()
    const response = await axios.post(
      `${config.apiUrl}/v2/channels/whatsapp/messages`,
      {
        from: process.env.ZENVIA_WHATSAPP_SENDER || 'your-sender',
        to: data.to,
        contents: [
          {
            type: 'text',
            text: data.message
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-TOKEN': config.apiKey
        }
      }
    )

    return response.status === 200
  }
}
