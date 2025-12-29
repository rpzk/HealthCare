import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores podem testar email' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { to, config } = body

    if (!to || !config) {
      return NextResponse.json(
        { error: 'Email e configuração são obrigatórios' },
        { status: 400 }
      )
    }

    // Preparar configuração para teste
    const testConfig = {
      enabled: true,
      from: config.SMTP_FROM || config.SMTP_USER || 'noreply@healthcare.com',
      provider: config.EMAIL_PROVIDER || 'smtp',
      smtp: {
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT || '587'),
        secure: config.SMTP_SECURE === 'true' || config.SMTP_SECURE === true,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS
        }
      }
    }

    // Validar configuração
    if (!testConfig.smtp.host || !testConfig.smtp.auth.user || !testConfig.smtp.auth.pass) {
      return NextResponse.json(
        { error: 'Configuração SMTP incompleta (Host, Usuário e Senha são obrigatórios)' },
        { status: 400 }
      )
    }

    // Enviar email de teste
    const result = await emailService.sendEmail(
      {
        to,
        subject: '🧪 Email de Teste - HealthCare',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">✅ Teste de Configuração de Email</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <p>Olá!</p>
              <p>Este é um <strong>email de teste</strong> para verificar se sua configuração de SMTP está funcionando corretamente.</p>
              
              <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 Detalhes da Configuração</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Provedor:</strong> ${testConfig.provider}</li>
                  <li><strong>Host SMTP:</strong> ${testConfig.smtp.host}</li>
                  <li><strong>Porta:</strong> ${testConfig.smtp.port}</li>
                  <li><strong>Segurança:</strong> ${testConfig.smtp.secure ? 'TLS' : 'Sem TLS'}</li>
                  <li><strong>Usuário:</strong> ${testConfig.smtp.auth.user}</li>
                  <li><strong>De:</strong> ${testConfig.from}</li>
                  <li><strong>Para:</strong> ${to}</li>
                </ul>
              </div>

              <div style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #155724;">✅ Sucesso!</h3>
                <p style="margin: 0; color: #155724;">Sua configuração de email SMTP está funcionando corretamente. Você pode usar este sistema para enviar notificações por email.</p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                <em>Este é um email automático gerado pelo sistema HealthCare. Por favor, não responda.</em>
              </p>
            </div>
            <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
              © ${new Date().getFullYear()} HealthCare System - Todos os direitos reservados
            </div>
          </div>
        `,
        text: 'Email de teste enviado com sucesso!\n\nSua configuração de SMTP está funcionando corretamente.'
      },
      testConfig as any
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error ? (result.error instanceof Error ? result.error.message : String(result.error)) : 'Erro desconhecido ao enviar email'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email de teste enviado com sucesso para ${to}!`,
      details: {
        to,
        provider: testConfig.provider,
        host: testConfig.smtp.host,
        port: testConfig.smtp.port
      }
    })
  } catch (error) {
    console.error('❌ Erro ao testar email:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro desconhecido ao testar configuração de email'

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: String(error)
      },
      { status: 500 }
    )
  }
}
