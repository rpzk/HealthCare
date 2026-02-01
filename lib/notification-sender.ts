/**
 * Notification Sender Service
 * 
 * Serviço unificado para envio de notificações por múltiplos canais:
 * - E-mail (via EmailService)
 * - WhatsApp (via WhatsAppService) 
 * - Push Notifications (futuro)
 * - SMS (futuro)
 * 
 * Features:
 * - Templates HTML para email e texto para WhatsApp
 * - Fallback automático entre canais
 * - Log de todas as notificações enviadas
 * - Retry com backoff exponencial
 * - Respeit preferências do usuário
 */

import { EmailService } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { SystemSettingsService } from '@/lib/system-settings-service'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ============ TYPES ============

export type SendChannel = 'email' | 'whatsapp' | 'push' | 'sms'

export type SendNotificationType = 
  | 'appointment_confirmation'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'exam_result_ready'
  | 'prescription_ready'
  | 'payment_confirmed'
  | 'payment_pending'
  | 'welcome'
  | 'password_reset'
  | 'queue_called'
  | 'medication_reminder'
  | 'follow_up_reminder'
  | 'custom'

export interface SendRecipient {
  userId?: string
  patientId?: string
  name: string
  email?: string
  phone?: string
  pushToken?: string
}

export interface SendResult {
  success: boolean
  channel: SendChannel
  messageId?: string
  error?: string
  sentAt?: Date
}

// ============ TEMPLATES ============

interface NotificationTemplate {
  subject: string
  emailHtml: string
  whatsappText: string
  pushText: string
}

const TEMPLATES: Record<SendNotificationType, NotificationTemplate> = {
  appointment_confirmation: {
    subject: '✅ Consulta Confirmada - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Consulta Confirmada</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px;">
            Olá, <strong>{patientName}</strong>!
          </p>
          <p style="color: #64748b; margin-bottom: 24px;">
            Sua consulta foi agendada com sucesso. Confira os detalhes:
          </p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #667eea; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">📅 Data</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{appointmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">🕐 Horário</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">👨‍⚕️ Profissional</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{professionalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">🏥 Local</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{clinicAddress}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 24px 0;">
            💡 <strong>Dica:</strong> Chegue com 15 minutos de antecedência e traga um documento com foto.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{confirmationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Confirmar Presença
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 24px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            {clinicName} • {clinicPhone}<br>
            Em caso de dúvidas, entre em contato conosco.
          </p>
        </div>
      </div>
    `,
    whatsappText: `✅ *Consulta Confirmada*

Olá, {patientName}!

Sua consulta foi agendada com sucesso:

📅 *Data:* {appointmentDate}
🕐 *Horário:* {appointmentTime}
👨‍⚕️ *Profissional:* {professionalName}
🏥 *Local:* {clinicAddress}

💡 Chegue com 15 minutos de antecedência.

Para confirmar presença, responda *SIM*.
Para cancelar, responda *CANCELAR*.

_{clinicName}_`,
    pushText: 'Consulta confirmada para {appointmentDate} às {appointmentTime}'
  },

  appointment_reminder: {
    subject: '⏰ Lembrete: Consulta {reminderText} - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Lembrete de Consulta</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px;">
            Olá, <strong>{patientName}</strong>!
          </p>
          <p style="color: #64748b; margin-bottom: 24px;">
            Lembramos que você tem uma consulta agendada <strong>{reminderText}</strong>.
          </p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">📅 Data</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{appointmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">🕐 Horário</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">👨‍⚕️ Profissional</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{professionalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">🏥 Local</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">{clinicAddress}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 24px 0;">
            📋 Não esqueça de trazer documento com foto e cartão do convênio (se houver).
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{confirmationLink}" style="display: inline-block; background: #10b981; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">
              ✓ Confirmar
            </a>
            <a href="{cancelLink}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">
              ✗ Cancelar
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 24px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            {clinicName} • {clinicPhone}
          </p>
        </div>
      </div>
    `,
    whatsappText: `⏰ *Lembrete de Consulta*

Olá, {patientName}!

Sua consulta é *{reminderText}*:

📅 {appointmentDate}
🕐 {appointmentTime}
👨‍⚕️ {professionalName}

Confirma sua presença?
Responda *SIM* ou *NÃO*

_{clinicName}_`,
    pushText: '⏰ Consulta {reminderText} às {appointmentTime}'
  },

  appointment_cancelled: {
    subject: '❌ Consulta Cancelada - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">❌ Consulta Cancelada</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Sua consulta foi cancelada.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 8px 0;"><strong>📅 Data:</strong> {appointmentDate}</p>
            <p style="margin: 8px 0;"><strong>🕐 Horário:</strong> {appointmentTime}</p>
            <p style="margin: 8px 0;"><strong>👨‍⚕️ Profissional:</strong> {professionalName}</p>
            <p style="margin: 8px 0;"><strong>📝 Motivo:</strong> {cancellationReason}</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{rescheduleLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reagendar Consulta
            </a>
          </div>
        </div>
      </div>
    `,
    whatsappText: `❌ *Consulta Cancelada*

Olá, {patientName}.

Sua consulta foi cancelada:
📅 {appointmentDate} às {appointmentTime}

Motivo: {cancellationReason}

Para reagendar: {rescheduleLink}

_{clinicName}_`,
    pushText: 'Consulta de {appointmentDate} foi cancelada'
  },

  appointment_rescheduled: {
    subject: '🔄 Consulta Reagendada - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔄 Consulta Reagendada</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Sua consulta foi reagendada para uma nova data.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 8px 0;"><strong>📅 Nova Data:</strong> {appointmentDate}</p>
            <p style="margin: 8px 0;"><strong>🕐 Novo Horário:</strong> {appointmentTime}</p>
            <p style="margin: 8px 0;"><strong>👨‍⚕️ Profissional:</strong> {professionalName}</p>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px;">Data anterior: {oldDate} às {oldTime}</p>
        </div>
      </div>
    `,
    whatsappText: `🔄 *Consulta Reagendada*

Olá, {patientName}!

📅 *Nova Data:* {appointmentDate}
🕐 *Novo Horário:* {appointmentTime}
👨‍⚕️ {professionalName}

_Anterior: {oldDate} às {oldTime}_

_{clinicName}_`,
    pushText: 'Consulta reagendada para {appointmentDate} às {appointmentTime}'
  },

  exam_result_ready: {
    subject: '🔬 Resultado de Exame Disponível - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔬 Resultado Disponível</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">O resultado do seu exame está disponível.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">
            <p style="margin: 8px 0;"><strong>🔬 Exame:</strong> {examName}</p>
            <p style="margin: 8px 0;"><strong>📅 Data do Exame:</strong> {examDate}</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{resultLink}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Ver Resultado
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px;">
            💡 Leve o resultado para seu médico na próxima consulta.
          </p>
        </div>
      </div>
    `,
    whatsappText: `🔬 *Resultado de Exame Disponível*

Olá, {patientName}!

O resultado do seu exame *{examName}* está pronto.

📅 Data do exame: {examDate}

Acesse: {resultLink}

_{clinicName}_`,
    pushText: 'Resultado do exame {examName} disponível'
  },

  prescription_ready: {
    subject: '💊 Receita Digital Disponível - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💊 Receita Digital</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Sua receita digital foi emitida pelo Dr(a). {professionalName}.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{prescriptionLink}" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Baixar Receita (PDF)
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px;">
            Apresente esta receita na farmácia de sua preferência.
          </p>
        </div>
      </div>
    `,
    whatsappText: `💊 *Receita Digital Emitida*

Olá, {patientName}!

Dr(a). {professionalName} emitiu sua receita.

Baixe: {prescriptionLink}

_{clinicName}_`,
    pushText: 'Nova receita digital disponível'
  },

  payment_confirmed: {
    subject: '✅ Pagamento Confirmado - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Pagamento Confirmado</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Seu pagamento foi confirmado com sucesso.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">
            <p style="margin: 8px 0;"><strong>💰 Valor:</strong> R$ {amount}</p>
            <p style="margin: 8px 0;"><strong>📅 Data:</strong> {paymentDate}</p>
            <p style="margin: 8px 0;"><strong>💳 Método:</strong> {paymentMethod}</p>
            <p style="margin: 8px 0;"><strong>📝 Referência:</strong> {reference}</p>
          </div>
        </div>
      </div>
    `,
    whatsappText: `✅ *Pagamento Confirmado*

Olá, {patientName}!

💰 Valor: R$ {amount}
💳 Método: {paymentMethod}
📅 Data: {paymentDate}

Obrigado!

_{clinicName}_`,
    pushText: 'Pagamento de R$ {amount} confirmado'
  },

  payment_pending: {
    subject: '⏳ Pagamento Pendente - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏳ Pagamento Pendente</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Identificamos um pagamento pendente.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 8px 0;"><strong>💰 Valor:</strong> R$ {amount}</p>
            <p style="margin: 8px 0;"><strong>📅 Vencimento:</strong> {dueDate}</p>
            <p style="margin: 8px 0;"><strong>📝 Referência:</strong> {reference}</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{paymentLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Pagar Agora
            </a>
          </div>
        </div>
      </div>
    `,
    whatsappText: `⏳ *Pagamento Pendente*

Olá, {patientName}!

💰 Valor: R$ {amount}
📅 Vencimento: {dueDate}

Pague: {paymentLink}

_{clinicName}_`,
    pushText: 'Pagamento pendente: R$ {amount}'
  },

  welcome: {
    subject: '👋 Bem-vindo(a) à {clinicName}!',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">👋 Bem-vindo(a)!</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">
            Seu cadastro na <strong>{clinicName}</strong> foi concluído com sucesso.
          </p>
          
          <p style="color: #64748b;">Agora você pode:</p>
          <ul style="color: #64748b;">
            <li>📅 Agendar consultas online</li>
            <li>🔬 Ver resultados de exames</li>
            <li>💊 Acessar suas receitas digitais</li>
            <li>📋 Acompanhar seu histórico médico</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{portalLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Acessar Portal
            </a>
          </div>
        </div>
      </div>
    `,
    whatsappText: `👋 *Bem-vindo(a) à {clinicName}!*

Olá, {patientName}!

Seu cadastro foi concluído.

Pelo portal você pode:
✅ Agendar consultas
✅ Ver resultados de exames
✅ Acessar receitas digitais

Acesse: {portalLink}

Estamos à disposição! 🏥`,
    pushText: 'Bem-vindo(a) à {clinicName}!'
  },

  password_reset: {
    subject: '🔐 Redefinição de Senha - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Redefinir Senha</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá!</p>
          <p style="color: #64748b;">
            Recebemos uma solicitação para redefinir sua senha.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{resetLink}" style="display: inline-block; background: #6b7280; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px;">
            ⚠️ Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.
          </p>
        </div>
      </div>
    `,
    whatsappText: `🔐 *Redefinição de Senha*

Link para nova senha:
{resetLink}

⚠️ Válido por 1 hora.

Se não foi você, ignore esta mensagem.

_{clinicName}_`,
    pushText: 'Link de redefinição de senha enviado'
  },

  queue_called: {
    subject: '🔔 Sua vez chegou! - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Sua Vez!</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc; text-align: center;">
          <p style="font-size: 18px; color: #1e293b;">
            <strong>{patientName}</strong>, dirija-se ao
          </p>
          <p style="font-size: 48px; color: #10b981; font-weight: bold; margin: 24px 0;">
            {roomName}
          </p>
        </div>
      </div>
    `,
    whatsappText: `🔔 *SUA VEZ CHEGOU!*

{patientName}, dirija-se ao:

🚪 *{roomName}*

_{clinicName}_`,
    pushText: '🔔 Sua vez! Vá ao {roomName}'
  },

  medication_reminder: {
    subject: '💊 Hora do Medicamento - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💊 Hora do Medicamento</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">Lembrete para tomar seu medicamento.</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">
            <p style="margin: 8px 0;"><strong>💊 Medicamento:</strong> {medicationName}</p>
            <p style="margin: 8px 0;"><strong>💉 Dosagem:</strong> {dosage}</p>
            <p style="margin: 8px 0;"><strong>📝 Instruções:</strong> {instructions}</p>
          </div>
        </div>
      </div>
    `,
    whatsappText: `💊 *Lembrete de Medicamento*

Olá, {patientName}!

Hora de tomar:
💊 *{medicationName}*
💉 Dosagem: {dosage}
📝 {instructions}

_{clinicName}_`,
    pushText: '💊 Hora de tomar {medicationName}'
  },

  follow_up_reminder: {
    subject: '📅 Hora de Agendar Retorno - {clinicName}',
    emailHtml: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📅 Agende seu Retorno</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc;">
          <p style="font-size: 16px; color: #1e293b;">Olá, <strong>{patientName}</strong>!</p>
          <p style="color: #64748b;">
            Sua última consulta foi há {daysSinceLastVisit} dias com Dr(a). {professionalName}.
            Está na hora de agendar seu retorno.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{scheduleLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Agendar Retorno
            </a>
          </div>
        </div>
      </div>
    `,
    whatsappText: `📅 *Agende seu Retorno*

Olá, {patientName}!

Última consulta há {daysSinceLastVisit} dias.
Dr(a). {professionalName} recomenda um retorno.

Agende: {scheduleLink}

_{clinicName}_`,
    pushText: 'Hora de agendar retorno médico'
  },

  custom: {
    subject: '{subject}',
    emailHtml: '{body}',
    whatsappText: '{body}',
    pushText: '{body}'
  }
}

// ============ SERVICE CLASS ============

class NotificationSenderServiceClass {
  
  /**
   * Envia notificação por múltiplos canais
   */
  async send(
    type: SendNotificationType,
    recipient: SendRecipient,
    data: Record<string, unknown>,
    options?: {
      channels?: SendChannel[]
      priority?: 'low' | 'normal' | 'high'
      templateOverride?: { subject?: string; body?: string }
    }
  ): Promise<SendResult[]> {
    const results: SendResult[] = []
    
    // Determinar canais a usar
    const channels = options?.channels || this.getDefaultChannels(recipient)
    
    // Carregar dados da clínica
    const clinicData = await this.getClinicData()
    
    // Mesclar dados
    const mergedData = {
      ...clinicData,
      ...data,
      patientName: recipient.name,
    }
    
    // Enviar por cada canal
    for (const channel of channels) {
      try {
        const result = await this.sendByChannel(channel, type, recipient, mergedData, options?.templateOverride)
        results.push(result)
        
        // Logar no banco
        await this.logSentNotification(type, channel, recipient, mergedData, result)
        
        // Se um canal teve sucesso e não é alta prioridade, parar
        if (result.success && options?.priority !== 'high') {
          break
        }
      } catch (error) {
        logger.error(`Erro ao enviar notificação via ${channel}:`, error)
        results.push({
          success: false,
          channel,
          error: (error as Error).message
        })
      }
    }
    
    return results
  }

  /**
   * Envia por canal específico
   */
  private async sendByChannel(
    channel: SendChannel,
    type: SendNotificationType,
    recipient: SendRecipient,
    data: Record<string, unknown>,
    templateOverride?: { subject?: string; body?: string }
  ): Promise<SendResult> {
    const template = TEMPLATES[type]
    
    switch (channel) {
      case 'email':
        return this.sendEmail(template, recipient, data, templateOverride)
        
      case 'whatsapp':
        return this.sendWhatsApp(template, recipient, data, templateOverride)
        
      case 'push':
        return { success: false, channel, error: 'Push notifications em implementação' }
        
      case 'sms':
        return { success: false, channel, error: 'SMS em implementação' }
        
      default:
        return { success: false, channel, error: 'Canal desconhecido' }
    }
  }

  /**
   * Envia e-mail
   */
  private async sendEmail(
    template: NotificationTemplate,
    recipient: SendRecipient,
    data: Record<string, unknown>,
    templateOverride?: { subject?: string; body?: string }
  ): Promise<SendResult> {
    if (!recipient.email) {
      return { success: false, channel: 'email', error: 'E-mail não disponível' }
    }
    
    const emailService = EmailService.getInstance()
    const subject = this.interpolate(templateOverride?.subject || template.subject, data)
    const html = templateOverride?.body || this.interpolate(template.emailHtml, data)
    
    const result = await emailService.sendEmail({
      to: recipient.email,
      subject,
      html,
      text: this.htmlToText(html)
    })
    
    return {
      success: result.success,
      channel: 'email',
      error: result.error ? String(result.error) : undefined,
      sentAt: new Date()
    }
  }

  /**
   * Envia WhatsApp
   */
  private async sendWhatsApp(
    template: NotificationTemplate,
    recipient: SendRecipient,
    data: Record<string, unknown>,
    templateOverride?: { subject?: string; body?: string }
  ): Promise<SendResult> {
    if (!recipient.phone) {
      return { success: false, channel: 'whatsapp', error: 'Telefone não disponível' }
    }
    
    const message = templateOverride?.body || this.interpolate(template.whatsappText, data)
    
    // WhatsAppService usa { to, message }
    const success = await WhatsAppService.sendMessage({
      to: this.normalizePhone(recipient.phone),
      message
    })
    
    return {
      success,
      channel: 'whatsapp',
      error: success ? undefined : 'Falha ao enviar WhatsApp',
      sentAt: new Date()
    }
  }

  /**
   * Normaliza número de telefone para formato internacional
   */
  private normalizePhone(phone: string): string {
    // Remove tudo que não é dígito
    const digits = phone.replace(/\D/g, '')
    
    // Se não começa com 55, adiciona código do Brasil
    if (!digits.startsWith('55')) {
      return '55' + digits
    }
    
    return digits
  }

  /**
   * Obtém canais padrão baseado no recipient
   */
  private getDefaultChannels(recipient: SendRecipient): SendChannel[] {
    const channels: SendChannel[] = []
    
    // WhatsApp é preferido se disponível
    if (recipient.phone) {
      channels.push('whatsapp')
    }
    
    // Email como fallback
    if (recipient.email) {
      channels.push('email')
    }
    
    return channels.length > 0 ? channels : ['email']
  }

  /**
   * Carrega dados da clínica
   */
  private async getClinicData(): Promise<Record<string, string>> {
    const settings = await SystemSettingsService.getMany([
      'CLINIC_NAME',
      'CLINIC_TRADE_NAME',
      'CLINIC_PHONE',
      'CLINIC_ADDRESS',
      'CLINIC_CITY'
    ])
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    return {
      clinicName: settings.CLINIC_TRADE_NAME || settings.CLINIC_NAME || 'Healthcare',
      clinicPhone: settings.CLINIC_PHONE || '',
      clinicAddress: [settings.CLINIC_ADDRESS, settings.CLINIC_CITY].filter(Boolean).join(', '),
      portalLink: baseUrl,
      baseUrl
    }
  }

  /**
   * Interpola variáveis no template
   */
  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  /**
   * Converte HTML para texto plano
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Loga notificação enviada no banco
   */
  private async logSentNotification(
    type: SendNotificationType,
    channel: SendChannel,
    recipient: SendRecipient,
    data: Record<string, unknown>,
    result: SendResult
  ): Promise<void> {
    try {
      await prisma.sentNotification.create({
        data: {
          type,
          channel,
          recipientId: recipient.patientId || recipient.userId || 'unknown',
          recipientType: recipient.patientId ? 'PATIENT' : 'USER',
          recipientName: recipient.name,
          recipientContact: channel === 'email' ? recipient.email : recipient.phone,
          status: result.success ? 'SENT' : 'FAILED',
          templateData: data as Record<string, string>,
          error: result.error,
          messageId: result.messageId,
          sentAt: result.sentAt || new Date(),
        }
      })
    } catch (error) {
      // Se a tabela não existir, apenas loga
      logger.warn('Não foi possível logar notificação enviada:', error)
    }
  }

  // ============ MÉTODOS DE CONVENIÊNCIA ============

  /**
   * Envia confirmação de agendamento
   */
  async sendAppointmentConfirmation(appointment: {
    id: string
    patientName: string
    patientEmail?: string
    patientPhone?: string
    patientId: string
    professionalName: string
    date: Date
    time: string
    address?: string
  }): Promise<SendResult[]> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    return this.send('appointment_confirmation', {
      patientId: appointment.patientId,
      name: appointment.patientName,
      email: appointment.patientEmail,
      phone: appointment.patientPhone
    }, {
      appointmentDate: appointment.date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }),
      appointmentTime: appointment.time,
      professionalName: appointment.professionalName,
      clinicAddress: appointment.address || '',
      confirmationLink: `${baseUrl}/minha-saude/appointments/${appointment.id}/confirm`
    })
  }

  /**
   * Envia lembrete de consulta
   */
  async sendAppointmentReminder(appointment: {
    id: string
    patientName: string
    patientEmail?: string
    patientPhone?: string
    patientId: string
    professionalName: string
    date: Date
    time: string
    hoursUntil: number
    address?: string
  }): Promise<SendResult[]> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    let reminderText = 'em breve'
    if (appointment.hoursUntil <= 2) {
      reminderText = 'em 2 horas'
    } else if (appointment.hoursUntil <= 24) {
      reminderText = 'amanhã'
    } else {
      reminderText = `em ${Math.ceil(appointment.hoursUntil / 24)} dias`
    }
    
    return this.send('appointment_reminder', {
      patientId: appointment.patientId,
      name: appointment.patientName,
      email: appointment.patientEmail,
      phone: appointment.patientPhone
    }, {
      appointmentDate: appointment.date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long' 
      }),
      appointmentTime: appointment.time,
      professionalName: appointment.professionalName,
      clinicAddress: appointment.address || '',
      reminderText,
      confirmationLink: `${baseUrl}/minha-saude/appointments/${appointment.id}/confirm`,
      cancelLink: `${baseUrl}/minha-saude/appointments/${appointment.id}/cancel`
    })
  }

  /**
   * Envia notificação de resultado de exame
   */
  async sendExamResultReady(exam: {
    patientName: string
    patientEmail?: string
    patientPhone?: string
    patientId: string
    examName: string
    examDate: Date
    resultId: string
  }): Promise<SendResult[]> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    return this.send('exam_result_ready', {
      patientId: exam.patientId,
      name: exam.patientName,
      email: exam.patientEmail,
      phone: exam.patientPhone
    }, {
      examName: exam.examName,
      examDate: exam.examDate.toLocaleDateString('pt-BR'),
      resultLink: `${baseUrl}/minha-saude/exams/${exam.resultId}`
    })
  }

  /**
   * Envia notificação de receita pronta
   */
  async sendPrescriptionReady(prescription: {
    patientName: string
    patientEmail?: string
    patientPhone?: string
    patientId: string
    professionalName: string
    prescriptionId: string
  }): Promise<SendResult[]> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    return this.send('prescription_ready', {
      patientId: prescription.patientId,
      name: prescription.patientName,
      email: prescription.patientEmail,
      phone: prescription.patientPhone
    }, {
      professionalName: prescription.professionalName,
      prescriptionLink: `${baseUrl}/minha-saude/prescriptions/${prescription.prescriptionId}`
    })
  }

  /**
   * Chama paciente na fila
   */
  async sendQueueCall(patient: {
    name: string
    email?: string
    phone?: string
    patientId: string
    roomName: string
  }): Promise<SendResult[]> {
    return this.send('queue_called', {
      patientId: patient.patientId,
      name: patient.name,
      email: patient.email,
      phone: patient.phone
    }, {
      roomName: patient.roomName
    }, {
      channels: ['whatsapp'], // Fila só vai por WhatsApp
      priority: 'high'
    })
  }

  /**
   * Envia lembrete de medicamento
   */
  async sendMedicationReminder(reminder: {
    patientName: string
    patientEmail?: string
    patientPhone?: string
    patientId: string
    medicationName: string
    dosage: string
    instructions?: string
  }): Promise<SendResult[]> {
    return this.send('medication_reminder', {
      patientId: reminder.patientId,
      name: reminder.patientName,
      email: reminder.patientEmail,
      phone: reminder.patientPhone
    }, {
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      instructions: reminder.instructions || ''
    }, {
      channels: ['whatsapp'] // Lembrete de remédio só por WhatsApp
    })
  }
}

// Singleton export
export const NotificationSender = new NotificationSenderServiceClass()
