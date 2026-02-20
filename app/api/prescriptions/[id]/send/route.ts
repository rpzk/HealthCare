import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { emailService } from '@/lib/email-service'
import fs from 'fs/promises'
import path from 'path'

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // Fetch prescription with relations
    const prescription = await prisma.prescription.findUnique({
      where: { id: id as string },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
        items: true,
      }
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    // Check authorization (doctor or admin)
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const recipientEmail = (body?.email as string) || prescription.patient?.email
    const method = (body?.method as string) || 'email' // email, whatsapp, sms

    if (!recipientEmail && method === 'email') {
      return NextResponse.json(
        { error: 'Email do paciente não configurado. Informe um e-mail ou cadastre o e-mail do paciente.' },
        { status: 400 }
      )
    }

    // Anexar PDF quando existir (arquivo assinado salvo no servidor)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
    const pdfPath = path.join(uploadsDir, `${id}.pdf`)
    let pdfAttachment: { filename: string; content: Buffer; contentType: string } | undefined
    try {
      const pdfBuffer = await fs.readFile(pdfPath)
      pdfAttachment = {
        filename: `receita-${prescription.patient?.name || id}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_'),
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    } catch {
      // PDF não encontrado (receita não assinada ou arquivo não gerado) — envia e-mail sem anexo
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const prescriptionUrl = `${baseUrl}/prescriptions/${id}`

    // Format medications list for email - use items or main medication
    const items = prescription.items || []
    let medicationsHtml = ''
    
    if (items.length > 0) {
      medicationsHtml = items.map((item) => `
        <li style="margin-bottom: 8px;">
          <strong>${(item as any).customName || 'Medicamento'}</strong><br/>
          <span style="color: #666;">${(item as any).dosage || ''} - ${(item as any).frequency || ''} - ${(item as any).instructions || ''}</span>
        </li>
      `).join('')
    } else {
      medicationsHtml = `
        <li style="margin-bottom: 8px;">
          <strong>${prescription.medication}</strong><br/>
          <span style="color: #666;">${prescription.dosage} - ${prescription.frequency} - ${prescription.instructions || ''}</span>
        </li>
      `
    }

    // Send email using email service
    if (method === 'email' && recipientEmail) {
      const emailResult = await emailService.sendEmail({
        to: recipientEmail,
        subject: `Sua Receita Médica - Dr(a). ${prescription.doctor?.name || 'Médico'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Prescrição Médica</h2>
            <p>Olá ${prescription.patient?.name || 'Paciente'},</p>
            <p>${pdfAttachment ? 'Em anexo está o PDF da sua receita médica.' : 'Sua receita médica está disponível no sistema.'}</p>
            
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin-top: 0;">Medicamentos prescritos:</h3>
              <ul style="padding-left: 20px;">
                ${medicationsHtml}
              </ul>
            </div>
            
            <p><strong>Médico responsável:</strong> Dr(a). ${prescription.doctor?.name || 'Médico'}</p>
            
            ${pdfAttachment
              ? `<p style="background: #ecfdf5; padding: 12px; border-radius: 6px; font-size: 13px;">
                 <strong>Para validar oficialmente</strong> (ex.: na farmácia): use o PDF em anexo no site <a href="https://validar.iti.gov.br">validar.iti.gov.br</a>.
                 </p>`
              : `<p style="font-size: 13px;">Você também pode acessar e baixar a receita pelo link abaixo.</p>
                 <p><a href="${prescriptionUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar receita no sistema</a></p>`
            }
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Em caso de dúvidas, entre em contato com a clínica.
            </p>
          </div>
        `,
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
      })

      if (!emailResult.success) {
        logger.error('[PRESCRIPTION SEND] Erro ao enviar email:', emailResult.error)
        return NextResponse.json(
          { error: 'Erro ao enviar email. Verifique as configurações de SMTP.' },
          { status: 500 }
        )
      }
    }

    logger.info(`[PRESCRIPTION SHARE] Enviado para ${method}:`, {
      prescriptionId: id,
      patient: prescription.patient?.name,
      recipient: recipientEmail,
      url: prescriptionUrl
    })

    return NextResponse.json({
      success: true,
      message: `Prescrição enviada para ${recipientEmail}`,
      shareUrl: prescriptionUrl,
      method
    })

  } catch (error) {
    logger.error('Erro ao enviar prescrição:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar prescrição' },
      { status: 500 }
    )
  }
})
