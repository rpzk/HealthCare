import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  message: z.string().trim().optional()
})

export async function POST(req: NextRequest) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Body inválido (JSON esperado).' },
        { status: 400 }
      )
    }
    const { name, email, message } = schema.parse(body)

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, email: { not: '' } },
      select: { email: true, name: true }
    })

    if (admins.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum administrador ativo encontrado.' },
        { status: 409 }
      )
    }

    const emailService = EmailService.getInstance()
    const config = await emailService.getConfig()

    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Envio de e-mail está desativado no sistema.' },
        { status: 503 }
      )
    }

    const recipients = admins.map((a) => a.email)

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000'

    const invitePrefillUrl = `${baseUrl}/admin/invites?email=${encodeURIComponent(email)}`

    const subject = 'Solicitação de cadastro'
    const safeMessage = (message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const html = `
      <div style="font-family: sans-serif; color: #111;">
        <h2>Solicitação de cadastro</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${safeMessage ? `<p><strong>Mensagem:</strong><br/>${safeMessage.replace(/\n/g, '<br/>')}</p>` : ''}

        <div style="margin: 18px 0 10px;">
          <a
            href="${invitePrefillUrl}"
            style="display: inline-block; padding: 10px 14px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir gerador de convite (pré-preenchido)
          </a>
        </div>

        <p style="margin: 0; color: #555; font-size: 12px;">
          Dica: ao gerar o convite, o sistema tenta enviar o e-mail automaticamente. Se o envio estiver desativado, copie o link gerado e envie manualmente.
        </p>
        <p style="margin-top: 16px; color: #555;">Enviado via /register</p>
      </div>
    `

    const result = await emailService.sendEmail({
      to: recipients,
      subject,
      html,
      text: `Solicitação de cadastro\n\nNome: ${name}\nEmail: ${email}${message ? `\nMensagem: ${message}` : ''}\n\nGerar convite (pré-preenchido): ${invitePrefillUrl}`
    }, config)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Falha ao enviar e-mail.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    console.error('[REGISTER_REQUEST_ACCESS]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
