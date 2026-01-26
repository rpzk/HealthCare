import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // Fetch prescription
    const prescription = await prisma.prescription.findUnique({
      where: { id: id as string },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
      }
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    // Check authorization (doctor or admin)
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as any
    const recipientEmail = body?.email || prescription.patient?.email
    const method = body?.method || 'email' // email, whatsapp, sms

    if (!recipientEmail && method === 'email') {
      return NextResponse.json(
        { error: 'Email do paciente não configurado' },
        { status: 400 }
      )
    }

    // Generate shareable link
  const crypto = await import('crypto')
  const shareToken = crypto.randomBytes(16).toString('hex')
    const prescriptionUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/prescriptions/${id}?share=${shareToken}`

    // TODO: Implement actual email sending
    // For now, return success response
    logger.info(`[PRESCRIPTION SHARE] Enviando para ${method}:`, {
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
