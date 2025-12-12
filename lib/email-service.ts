import { auditLogger, AuditAction } from '@/lib/audit-logger'
import nodemailer from 'nodemailer'
import { settings } from '@/lib/settings'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailConfig {
  enabled: boolean
  from: string
  provider: string
  smtp: {
    host?: string
    port: number
    secure: boolean
    auth: {
      user?: string
      pass?: string
    }
  }
}

export class EmailService {
  private static instance: EmailService
  
  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  public async getConfig(): Promise<EmailConfig> {
    // Carregar configurações do banco (com fallback para env vars)
    const dbSettings = await settings.getMany([
      'EMAIL_ENABLED', 'EMAIL_FROM', 'EMAIL_PROVIDER',
      'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS'
    ])

    return {
      enabled: dbSettings.EMAIL_ENABLED ? dbSettings.EMAIL_ENABLED === 'true' : process.env.EMAIL_ENABLED === 'true',
      from: dbSettings.EMAIL_FROM || process.env.EMAIL_FROM || 'noreply@healthcare.system',
      provider: dbSettings.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER || 'console',
      smtp: {
        host: dbSettings.SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(dbSettings.SMTP_PORT || process.env.SMTP_PORT || '587'),
        secure: dbSettings.SMTP_SECURE ? dbSettings.SMTP_SECURE === 'true' : process.env.SMTP_SECURE === 'true',
        auth: {
          user: dbSettings.SMTP_USER || process.env.SMTP_USER,
          pass: dbSettings.SMTP_PASS || process.env.SMTP_PASS
        }
      }
    }
  }

  private async getTransporter(config: EmailConfig) {
    if (config.provider === 'smtp') {
      return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.auth.user,
          pass: config.smtp.auth.pass
        }
      })
    }
    return null
  }

  /**
   * Envia um e-mail
   */
  public async sendEmail(options: EmailOptions, overrideConfig?: EmailConfig): Promise<{ success: boolean, error?: unknown }> {
    const config = overrideConfig || await this.getConfig()
    const { to, subject, html, text } = options
    const from = options.from || config.from

    // DEBUG: Log de configuração
    console.log('📧 [EMAIL-SERVICE] Config:', {
      enabled: config.enabled,
      provider: config.provider,
      from: config.from,
      smtpHost: config.smtp.host,
      smtpPort: config.smtp.port,
      smtpUser: config.smtp.auth.user ? '✓' : '✗',
      smtpPass: config.smtp.auth.pass ? '✓' : '✗'
    })

    try {
      if (!config.enabled) {
        console.log('📧 EMAIL (DISABLED):', { to, subject })
        return { success: true }
      }

      // Implementação baseada no provedor
      switch (config.provider) {
        case 'console':
          console.log('📧 EMAIL SENT (CONSOLE):', {
            from,
            to,
            subject,
            contentLength: html.length
          })
          break
        
        case 'smtp': {
          const transporter = await this.getTransporter(config)
          if (!transporter) {
            throw new Error('SMTP Transporter not initialized')
          }
          await transporter.sendMail({
            from,
            to,
            subject,
            html,
            text
          })
          break
        }
        
        default:
          console.warn(`⚠️ Provedor de e-mail desconhecido: ${config.provider}`)
          return { success: false, error: `Provedor desconhecido: ${config.provider}` }
      }

      // Log de auditoria
      auditLogger.log(
        'system',
        'system@healthcare',
        'SYSTEM',
        AuditAction.SYSTEM_CONFIG_CHANGE, // Usando uma ação genérica por enquanto
        'email',
        {
          details: { to, subject, provider: config.provider },
          success: true
        }
      )

      return { success: true }

    } catch (error) {
      console.error('❌ Erro ao enviar e-mail:', error)
      
      auditLogger.log(
        'system',
        'system@healthcare',
        'SYSTEM',
        AuditAction.API_ERROR,
        'email',
        {
          details: { to, subject, error: (error as Error).message },
          success: false
        }
      )
      
      return { success: false, error }
    }
  }

  /**
   * Template: Boas-vindas
   */
  public async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject: 'Bem-vindo ao HealthCare System',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>Olá, ${name}! 👋</h1>
          <p>Seja bem-vindo ao <strong>HealthCare System</strong>.</p>
          <p>Sua conta foi criada com sucesso. Você já pode acessar o sistema e gerenciar seus dados de saúde.</p>
          <br>
          <p>Atenciosamente,<br>Equipe HealthCare</p>
        </div>
      `,
      text: `Olá ${name}, bem-vindo ao HealthCare System! Sua conta foi criada com sucesso.`
    })
    return result.success
  }

  /**
   * Template: Recuperação de Senha
   */
  public async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject: 'Recuperação de Senha - HealthCare',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Recuperação de Senha</h2>
          <p>Você solicitou a redefinição de sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
          <p><small>Se você não solicitou isso, ignore este e-mail.</small></p>
        </div>
      `,
      text: `Recuperação de Senha: Acesse o link para redefinir: ${resetLink}`
    })
    return result.success
  }

  /**
   * Template: Convite de Registro
   */
  public async sendInviteEmail(to: string, inviteLink: string): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject: 'Convite para HealthCare System',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Você foi convidado!</h2>
          <p>Você recebeu um convite para se cadastrar no <strong>HealthCare System</strong>.</p>
          <p>Clique no botão abaixo para completar seu cadastro:</p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aceitar Convite</a>
          <p><small>Este link expira em 7 dias.</small></p>
        </div>
      `,
      text: `Você foi convidado para o HealthCare System. Acesse o link para se cadastrar: ${inviteLink}`
    })
    return result.success
  }

  /**
   * Template: Questionário de Saúde
   */
  public async sendQuestionnaireEmail(
    to: string, 
    patientName: string, 
    questionnaireName: string, 
    questionnaireLink: string,
    expiresAt?: Date
  ): Promise<boolean> {
    const expiryText = expiresAt 
      ? `<p><small>⏰ Este link expira em ${expiresAt.toLocaleDateString('pt-BR')}.</small></p>`
      : ''
    
    const result = await this.sendEmail({
      to,
      subject: `📋 Questionário de Saúde: ${questionnaireName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Questionário de Saúde</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Olá, <strong>${patientName}</strong>!</p>
            
            <p style="font-size: 15px; color: #4b5563;">
              Sua equipe de saúde preparou um questionário especial para você:
            </p>
            
            <div style="background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h2 style="color: #059669; margin: 0 0 10px 0;">${questionnaireName}</h2>
            </div>
            
            <p style="font-size: 15px; color: #4b5563;">
              Este questionário nos ajudará a compreender melhor sua saúde e oferecer um atendimento mais personalizado.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${questionnaireLink}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                ✨ Responder Questionário
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              💡 <strong>Dica:</strong> Reserve cerca de 15-20 minutos em um local tranquilo para responder com calma.
            </p>
            
            ${expiryText}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 13px; color: #9ca3af; text-align: center;">
              Este e-mail foi enviado pelo HealthCare System.<br>
              Se você não esperava este questionário, por favor entre em contato com sua clínica.
            </p>
          </div>
        </div>
      `,
      text: `Olá ${patientName}! Você recebeu um questionário de saúde: ${questionnaireName}. Acesse: ${questionnaireLink}`
    })
    return result.success
  }

  /**
   * Template: Notificação de Resposta de Questionário (para profissional)
   */
  public async sendQuestionnaireCompletedNotification(
    to: string,
    professionalName: string,
    patientName: string,
    questionnaireName: string,
    viewLink: string
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject: `✅ ${patientName} respondeu: ${questionnaireName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: #10B981; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">✅ Questionário Respondido</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Olá, <strong>${professionalName}</strong>!</p>
            
            <p>O paciente <strong>${patientName}</strong> acabou de responder o questionário:</p>
            
            <div style="background: white; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0;">
              <strong>${questionnaireName}</strong>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${viewLink}" style="display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📊 Ver Respostas
              </a>
            </div>
          </div>
        </div>
      `,
      text: `${patientName} respondeu o questionário "${questionnaireName}". Acesse: ${viewLink}`
    })
    return result.success
  }
}

export const emailService = EmailService.getInstance()
