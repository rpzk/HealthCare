import { auditLogger, AuditAction } from '@/lib/audit-logger'
import nodemailer from 'nodemailer'
import { SystemSettingsService } from '@/lib/system-settings-service'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
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

  private static toBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y' || normalized === 'on') return true
      if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n' || normalized === 'off') return false
    }
    return defaultValue
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  public async getConfig(): Promise<EmailConfig> {
    // Carregar configurações do banco (descriptografadas) com fallback para env vars
    const dbSettings = await SystemSettingsService.getMany([
      'EMAIL_ENABLED',
      'EMAIL_FROM',
      'EMAIL_PROVIDER',
      'SMTP_FROM',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_PASSWORD'
    ])

    const enabled = (dbSettings.EMAIL_ENABLED || process.env.EMAIL_ENABLED) === 'true'
    const provider = dbSettings.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER || 'smtp'
    const smtpPass = await SystemSettingsService.getSmtpPassword()
    const smtpSecureValue = dbSettings.SMTP_SECURE ?? process.env.SMTP_SECURE

    return {
      enabled,
      from:
        dbSettings.EMAIL_FROM ||
        dbSettings.SMTP_FROM ||
        process.env.EMAIL_FROM ||
        process.env.SMTP_FROM ||
        'noreply@healthcare.system',
      provider,
      smtp: {
        host: dbSettings.SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(dbSettings.SMTP_PORT || process.env.SMTP_PORT || '587'),
        secure: EmailService.toBoolean(smtpSecureValue, false),
        auth: {
          user: dbSettings.SMTP_USER || process.env.SMTP_USER,
          pass: smtpPass
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
        },
        // Avoid long hangs in production when SMTP is unreachable.
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
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
    const configuredFrom = options.from || config.from

    // Some SMTP providers (notably Gmail) may reject or silently drop messages
    // when the From domain doesn't match the authenticated user (DMARC/SPF).
    // In that case, send using the authenticated user and preserve the desired
    // address as Reply-To.
    const smtpUser = config.smtp.auth.user
    const smtpHost = config.smtp.host || ''
    const isGmailSmtp = config.provider === 'smtp' && smtpHost.includes('gmail.com')
    const normalizedConfiguredFrom = String(configuredFrom || '').trim().toLowerCase()
    const normalizedSmtpUser = String(smtpUser || '').trim().toLowerCase()

    const effectiveFrom =
      isGmailSmtp && normalizedSmtpUser && normalizedConfiguredFrom && normalizedConfiguredFrom !== normalizedSmtpUser
        ? normalizedSmtpUser
        : configuredFrom

    const replyTo =
      isGmailSmtp && normalizedSmtpUser && normalizedConfiguredFrom && normalizedConfiguredFrom !== normalizedSmtpUser
        ? configuredFrom
        : undefined

    // DEBUG: Log de configuração
    console.log('📧 [EMAIL-SERVICE] Config:', {
      enabled: config.enabled,
      provider: config.provider,
      from: config.from,
      smtpHost: config.smtp.host,
      smtpPort: config.smtp.port,
      smtpSecure: config.smtp.secure,
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
            from: effectiveFrom,
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

          // Validate connection early to surface auth/TLS issues with a clearer error.
          try {
            await transporter.verify()
          } catch (verifyError) {
            const e = verifyError as any
            console.error('❌ [EMAIL-SERVICE] SMTP verify failed:', {
              message: e?.message,
              code: e?.code,
              command: e?.command,
              response: e?.response,
              responseCode: e?.responseCode,
              errno: e?.errno,
              syscall: e?.syscall,
              hostname: e?.hostname,
              port: e?.port,
            })
            throw verifyError
          }

          const info = await transporter.sendMail({
            from: effectiveFrom,
            ...(replyTo ? { replyTo } : {}),
            to,
            subject,
            html,
            text,
            ...(options.attachments ? { attachments: options.attachments } : {})
          })

          console.log('📧 [EMAIL-SERVICE] SMTP send result:', {
            from: effectiveFrom,
            replyTo,
            messageId: (info as any)?.messageId,
            accepted: (info as any)?.accepted,
            rejected: (info as any)?.rejected,
            response: (info as any)?.response,
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
      const e = error as any
      console.error('❌ Erro ao enviar e-mail:', {
        message: e?.message,
        code: e?.code,
        command: e?.command,
        response: e?.response,
        responseCode: e?.responseCode,
        errno: e?.errno,
        syscall: e?.syscall,
        hostname: e?.hostname,
        port: e?.port,
      })
      
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

  /**   * Template: Atestado Médico Emitido (para paciente)
   */
  public async sendCertificateIssuedNotification(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    certificateNumber: string,
    certificateYear: number,
    certificateType: string,
    startDate: string,
    endDate?: string,
    validationUrl?: string
  ): Promise<boolean> {
    const typeLabel = {
      MEDICAL_LEAVE: 'Afastamento',
      FITNESS: 'Aptidão',
      ACCOMPANIMENT: 'Acompanhante',
      TIME_OFF: 'Dispensa',
      CUSTOM: 'Personalizado'
    }[certificateType] || certificateType

    const result = await this.sendEmail({
      to: patientEmail,
      subject: `📋 Novo Atestado Médico - ${doctorName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: #3B82F6; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">📋 Novo Atestado Médico</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Olá, <strong>${patientName}</strong>!</p>
            
            <p>Você recebeu um novo atestado médico de <strong>${doctorName}</strong>.</p>
            
            <div style="background: white; border-left: 4px solid #3B82F6; padding: 15px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Nº do Atestado:</strong> ${String(certificateNumber).padStart(3, '0')}/${certificateYear}</p>
              <p style="margin: 5px 0;"><strong>Tipo:</strong> ${typeLabel}</p>
              <p style="margin: 5px 0;"><strong>Data Inicial:</strong> ${startDate}</p>
              ${endDate ? `<p style="margin: 5px 0;"><strong>Data Final:</strong> ${endDate}</p>` : ''}
            </div>
            
            ${validationUrl ? `
            <div style="text-align: center; margin: 25px 0;">
              <a href="${validationUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ✓ Validar Atestado
              </a>
            </div>
            ` : ''}
            
            <p style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              Este é um email automático. Por favor, não responda. Se tiver dúvidas, entre em contato com a clínica.
            </p>
          </div>
        </div>
      `,
      text: `Novo Atestado: ${String(certificateNumber).padStart(3, '0')}/${certificateYear} - ${typeLabel} - ${startDate} a ${endDate || 'sem data final'}`
    })
    return result.success
  }

  /**
   * Template: Atestado Revogado (para paciente)
   */
  public async sendCertificateRevokedNotification(
    patientEmail: string,
    patientName: string,
    certificateNumber: string,
    reason?: string
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to: patientEmail,
      subject: `⚠️ Atestado Revogado - ${String(certificateNumber).padStart(3, '0')}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: #EF4444; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Atestado Revogado</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Olá, <strong>${patientName}</strong>!</p>
            
            <p>O atestado nº <strong>${String(certificateNumber).padStart(3, '0')}</strong> foi <strong>revogado</strong>.</p>
            
            ${reason ? `
            <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Motivo:</strong> ${reason}</p>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Se você tiver dúvidas, entre em contato com a clínica imediatamente.</p>
            
            <p style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              Este é um email automático. Por favor, não responda.
            </p>
          </div>
        </div>
      `,
      text: `Atestado ${String(certificateNumber).padStart(3, '0')} foi revogado. ${reason ? `Motivo: ${reason}` : ''}`
    })
    return result.success
  }

  /**   * Template: Questionário de Saúde
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

// Certificate-specific email functions
export async function sendCertificateIssuedNotification(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  certificateNumber: string,
  certificateYear: number,
  certificateType: string,
  startDate: string,
  endDate?: string,
  validationUrl?: string
): Promise<boolean> {
  return emailService.sendCertificateIssuedNotification(
    patientEmail,
    patientName,
    doctorName,
    certificateNumber,
    certificateYear,
    certificateType,
    startDate,
    endDate,
    validationUrl
  )
}

export async function sendCertificateRevokedNotification(
  patientEmail: string,
  patientName: string,
  certificateNumber: string,
  reason?: string
): Promise<boolean> {
  return emailService.sendCertificateRevokedNotification(
    patientEmail,
    patientName,
    certificateNumber,
    reason
  )
}

// ===== APPOINTMENT NOTIFICATIONS =====

interface AppointmentConfirmationData {
  patientEmail: string
  patientName: string
  doctorName: string
  date: string
  time: string
  reason: string
  status: 'CONFIRMED' | 'SCHEDULED'
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmationData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .appointment-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .status-badge { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status-confirmed { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Confirmação de Agendamento</h1>
          <p>Sua consulta foi agendada com sucesso!</p>
        </div>
        <div class="content">
          <p>Olá <strong>${data.patientName}</strong>,</p>
          <p>Sua consulta foi agendada com sucesso em nosso sistema. Confira os detalhes abaixo:</p>
          
          <div class="appointment-info">
            <h3>📋 Detalhes da Consulta</h3>
            <p><strong>Profissional:</strong> ${data.doctorName}</p>
            <p><strong>Data:</strong> ${data.date}</p>
            <p><strong>Horário:</strong> ${data.time}</p>
            <p><strong>Motivo:</strong> ${data.reason}</p>
            <p>
              <strong>Status:</strong> 
              <span class="status-badge ${
                data.status === 'CONFIRMED' ? 'status-confirmed' : 'status-pending'
              }">
                ${data.status === 'CONFIRMED' ? '✓ Confirmada' : '⏳ Aguardando Aprovação'}
              </span>
            </p>
          </div>

          ${
            data.status === 'SCHEDULED'
              ? `
            <div class="appointment-info" style="background: #e7f3ff; border-left-color: #0066cc;">
              <p>⚠️ <strong>Aguardando Aprovação</strong></p>
              <p>Seu agendamento foi recebido e está aguardando aprovação do profissional. Você receberá uma notificação quando for confirmado.</p>
            </div>
          `
              : `
            <div class="appointment-info" style="background: #e8f5e9; border-left-color: #4caf50;">
              <p>✓ <strong>Confirmado!</strong></p>
              <p>Sua consulta foi confirmada. Apresente-se 10 minutos antes do horário agendado.</p>
            </div>
          `
          }

          <p style="margin-top: 20px;">Se você precisa cancelar ou remarcar, entre em contato conosco com antecedência.</p>

          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} HealthCare - Sistema de Agendamento</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const subjectPrefix = data.status === 'CONFIRMED' ? 'Agendamento confirmado' : 'Agendamento recebido'

  return emailService
    .sendEmail({
      to: data.patientEmail,
      subject: `${subjectPrefix} - ${data.doctorName}`,
      html,
    })
    .then((result) => result.success)
}

interface AppointmentCancellationData {
  patientEmail: string
  patientName: string
  doctorName: string
  date: string
  time: string
  reason?: string
}

export async function sendAppointmentCancellationEmail(
  data: AppointmentCancellationData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f93b1d 0%, #ea1e63 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .appointment-info { background: white; padding: 15px; border-left: 4px solid #f93b1d; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Agendamento Cancelado</h1>
          <p>Sua consulta foi cancelada</p>
        </div>
        <div class="content">
          <p>Olá <strong>${data.patientName}</strong>,</p>
          <p>Seu agendamento foi cancelado. Confira os detalhes abaixo:</p>
          
          <div class="appointment-info">
            <h3>📋 Detalhes do Cancelamento</h3>
            <p><strong>Profissional:</strong> ${data.doctorName}</p>
            <p><strong>Data (cancelada):</strong> ${data.date}</p>
            <p><strong>Horário (cancelado):</strong> ${data.time}</p>
            ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
          </div>

          <p>Se deseja remarcar, acesse nosso portal de agendamentos para escolher uma nova data.</p>

          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} HealthCare - Sistema de Agendamento</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return emailService.sendEmail({
    to: data.patientEmail,
    subject: `Agendamento cancelado - ${data.doctorName}`,
    html,
  }).then(result => result.success)
}

interface AppointmentRescheduleData {
  patientEmail: string
  patientName: string
  doctorName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
}

export async function sendAppointmentRescheduledEmail(
  data: AppointmentRescheduleData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .appointment-info { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Agendamento Remarcado</h1>
          <p>O horário da sua consulta foi atualizado</p>
        </div>
        <div class="content">
          <p>Olá <strong>${data.patientName}</strong>,</p>
          <p>Sua consulta com <strong>${data.doctorName}</strong> foi remarcada. Confira abaixo:</p>

          <div class="appointment-info">
            <h3>📅 Antes</h3>
            <p><strong>Data:</strong> ${data.oldDate}</p>
            <p><strong>Horário:</strong> ${data.oldTime}</p>
          </div>

          <div class="appointment-info">
            <h3>✅ Agora</h3>
            <p><strong>Data:</strong> ${data.newDate}</p>
            <p><strong>Horário:</strong> ${data.newTime}</p>
          </div>

          <p style="margin-top: 20px;">Se você tiver dúvidas ou precisar de outro horário, entre em contato com a clínica.</p>

          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} HealthCare - Sistema de Agendamento</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return emailService
    .sendEmail({
      to: data.patientEmail,
      subject: `Agendamento remarcado - ${data.doctorName}`,
      html,
    })
    .then((result) => result.success)
}

interface AppointmentReassignedData {
  patientEmail: string
  patientName: string
  oldDoctorName: string
  newDoctorName: string
  date: string
  time: string
}

export async function sendAppointmentReassignedEmail(
  data: AppointmentReassignedData
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .appointment-info { background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Profissional Atualizado</h1>
          <p>O profissional responsável pela sua consulta foi alterado</p>
        </div>
        <div class="content">
          <p>Olá <strong>${data.patientName}</strong>,</p>
          <p>O profissional do seu agendamento foi atualizado. Confira abaixo:</p>

          <div class="appointment-info">
            <h3>📋 Detalhes do Agendamento</h3>
            <p><strong>Data:</strong> ${data.date}</p>
            <p><strong>Horário:</strong> ${data.time}</p>
            <p><strong>Profissional anterior:</strong> ${data.oldDoctorName}</p>
            <p><strong>Novo profissional:</strong> ${data.newDoctorName}</p>
          </div>

          <p style="margin-top: 20px;">Se você tiver dúvidas, entre em contato com a clínica.</p>

          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} HealthCare - Sistema de Agendamento</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return emailService
    .sendEmail({
      to: data.patientEmail,
      subject: `Profissional atualizado - ${data.newDoctorName}`,
      html,
    })
    .then((result) => result.success)
}
