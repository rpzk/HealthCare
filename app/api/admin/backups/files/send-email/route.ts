import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { EmailService } from '@/lib/email-service'
import path from 'path'
import { promises as fs } from 'fs'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { filename, email } = await request.json()

    if (!filename || !email) {
      return NextResponse.json({ error: 'Filename e email obrigatórios' }, { status: 400 })
    }

    // Read PDF file
    const base = process.env.BACKUPS_DIR || '/app/backups'
    const filePath = path.join(base, filename)

    // Security check
    if (!filePath.startsWith(base)) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
    }

    const fileBuffer = await fs.readFile(filePath)

    // Send email with PDF attachment
    const emailService = EmailService.getInstance()
    const result = await emailService.sendEmail({
      to: email,
      subject: `Prontuário Médico - ${filename.replace(/^patient_|\.pdf$/g, '').replace(/_/g, ' ')}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #10b981;">Prontuário Médico</h2>
            <p>Segue em anexo o prontuário médico solicitado.</p>
            <p style="color: #666; font-size: 12px;">
              Gerado em ${new Date().toLocaleString('pt-BR')}
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">
              Este é um documento confidencial destinado apenas ao destinatário. 
              Se você recebeu esta mensagem por engano, favor deletá-la.
            </p>
          </body>
        </html>
      `,
      text: `Prontuário Médico anexado. Gerado em ${new Date().toLocaleString('pt-BR')}`,
      attachments: [
        {
          filename: filename,
          content: fileBuffer,
          contentType: 'application/pdf'
        }
      ]
    })

    if (!result.success) {
      throw new Error(result.error as string || 'Erro ao enviar email')
    }

    return NextResponse.json({
      success: true,
      message: `PDF enviado para ${email}`,
    })
  } catch (e: any) {
    logger.error('[Send PDF Email] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao enviar PDF' }, { status: 500 })
  }
}
