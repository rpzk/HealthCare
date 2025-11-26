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
    const { to } = body

    if (!to) {
      return new NextResponse('Email address is required', { status: 400 })
    }

    const success = await emailService.sendEmail({
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
          </ul>
        </div>
      `,
      text: 'Teste de E-mail: Sua configuração SMTP está funcionando corretamente!'
    })

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: 'Falha ao enviar e-mail. Verifique os logs do servidor.' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
