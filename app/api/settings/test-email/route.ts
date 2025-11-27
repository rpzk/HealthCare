import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService } from '@/lib/email-service'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    const { to, config: configFromRequest } = body

    if (!to) {
      return new NextResponse('Email address is required', { status: 400 })
    }

    let overrideConfig = undefined
    if (configFromRequest) {
      overrideConfig = {
        enabled: configFromRequest.EMAIL_ENABLED === 'true',
        from: configFromRequest.EMAIL_FROM,
        provider: configFromRequest.EMAIL_PROVIDER,
        smtp: {
          host: configFromRequest.SMTP_HOST,
          port: parseInt(configFromRequest.SMTP_PORT || '587'),
          secure: configFromRequest.SMTP_SECURE === 'true',
          auth: {
            user: configFromRequest.SMTP_USER,
            pass: configFromRequest.SMTP_PASS
          }
        }
      }
    }

    const config = overrideConfig || await emailService.getConfig()
    if (!config.enabled) {
      return NextResponse.json({ 
        success: false, 
        error: 'O envio de e-mails está desabilitado nas configurações do sistema. Salve as configurações com a opção "Habilitar envio de e-mails" marcada antes de testar.' 
      }, { status: 400 })
    }

    const result = await emailService.sendEmail({
      to,
      subject: 'Teste de Configuração de E-mail - HealthCare',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Teste de E-mail</h2>
          <p>Se você recebeu este e-mail, sua configuração SMTP está funcionando corretamente! ✅</p>
          <p><strong>Detalhes do envio:</strong></p>
          <ul>
            <li>Data: ${new Date().toLocaleString()}</li>
            <li>Enviado por: ${session.user.email}</li>
            <li>Provedor: ${config.provider}</li>
          </ul>
        </div>
      `,
      text: 'Teste de E-mail: Sua configuração SMTP está funcionando corretamente!'
    }, overrideConfig)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error)
      return NextResponse.json({ 
        success: false, 
        error: `Falha no envio: ${errorMessage}` 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
