
import { auditLogger, AuditAction } from '@/lib/audit-logger'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export class EmailService {
  private static instance: EmailService
  
  // Configuração (pode vir de variáveis de ambiente)
  private config = {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM || 'noreply@healthcare.system',
    provider: process.env.EMAIL_PROVIDER || 'console' // 'console', 'smtp', 'resend', etc.
  }

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Envia um e-mail
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options
    const from = options.from || this.config.from

    try {
      if (!this.config.enabled) {
        console.log('📧 EMAIL (DISABLED):', { to, subject })
        return true
      }

      // Implementação baseada no provedor
      switch (this.config.provider) {
        case 'console':
          console.log('📧 EMAIL SENT (CONSOLE):', {
            from,
            to,
            subject,
            contentLength: html.length
          })
          break
        
        // TODO: Adicionar implementações reais (SMTP, Resend, SendGrid)
        // case 'smtp':
        //   await this.sendSmtp(...)
        //   break
        
        default:
          console.warn(`⚠️ Provedor de e-mail desconhecido: ${this.config.provider}`)
          return false
      }

      // Log de auditoria
      auditLogger.log(
        'system',
        'system@healthcare',
        'SYSTEM',
        AuditAction.SYSTEM_CONFIG_CHANGE, // Usando uma ação genérica por enquanto
        'email',
        {
          details: { to, subject, provider: this.config.provider },
          success: true
        }
      )

      return true

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
      
      return false
    }
  }

  /**
   * Template: Boas-vindas
   */
  public async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    return this.sendEmail({
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
  }

  /**
   * Template: Recuperação de Senha
   */
  public async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    return this.sendEmail({
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
  }
}

export const emailService = EmailService.getInstance()
