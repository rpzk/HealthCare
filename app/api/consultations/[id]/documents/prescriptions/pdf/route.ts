import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'

export const runtime = 'nodejs'




// POST: Recebe { password } no body para assinar
export const POST = withDoctorAuth(async (req: NextRequest, { params, user }: { params: Record<string, string>, user: any }) => {
  try {
    const consultationId = params.id
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado obrigatória' }, { status: 400 })
    }

    // Busca certificado ativo do médico
    const cert = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, certificateType: 'A1', revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!cert || !cert.pfxFilePath) {
      return NextResponse.json({ error: 'Certificado digital A1 não encontrado para este usuário' }, { status: 404 })
    }

    // Valida senha (hash)
    const crypto = await import('crypto')
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    if (cert.pfxPasswordHash !== passwordHash) {
      return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
    }

    // Busca consulta e monta HTML
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { select: { id: true, name: true, cpf: true } },
        doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
        prescriptions: {
          where: { consultationId },
          orderBy: { createdAt: 'asc' },
          include: {
            items: {
              include: {
                medication: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })
    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    // Monta HTML da prescrição
    let html = `<html><head><meta charset='utf-8'><title>Prescrição Médica</title></head><body>`
    html += `<h1 style='text-align:center'>PRESCRIÇÃO MÉDICA</h1>`
    html += `<p><b>Médico:</b> ${consultation.doctor?.name || '—'}<br/>`
    if (consultation.doctor?.crmNumber) html += `CRM: ${consultation.doctor.crmNumber}<br/>`
    if (consultation.doctor?.licenseNumber) html += `${consultation.doctor.licenseType || 'Registro'}: ${consultation.doctor.licenseNumber}${consultation.doctor.licenseState ? '-' + consultation.doctor.licenseState : ''}<br/>`
    html += `</p>`
    html += `<p><b>Paciente:</b> ${consultation.patient?.name || '—'}`
    if (consultation.patient?.cpf) html += ` | CPF: ${decrypt(consultation.patient.cpf)}`
    html += `</p>`
    html += `<ol>`
    for (const p of consultation.prescriptions as any[]) {
      if (Array.isArray(p.items) && p.items.length > 0) {
        for (const it of p.items) {
          html += `<li><b>${it?.medication?.name || it?.customName || p.medication || 'Sem nome'}</b> - ${it?.dosage || p.dosage || ''} - ${it?.frequency || p.frequency || ''} - ${it?.duration || p.duration || ''} - ${it?.instructions || p.instructions || ''}</li>`
        }
      } else {
        html += `<li><b>${p.medication || 'Sem nome'}</b> - ${p.dosage || ''} - ${p.frequency || ''} - ${p.duration || ''} - ${p.instructions || ''}</li>`
      }
    }
    html += `</ol>`
    html += `<p style='margin-top:32px'>Consulta: ${consultation.id} - ${consultation.actualDate ? new Date(consultation.actualDate).toLocaleString('pt-BR') : ''}</p>`
    html += `</body></html>`

    // Assina via Gotenberg com certificado do usuário
    const pdf = await signPdfWithGotenberg({
      html,
      filename: `prescricoes-${consultationId}.pdf`,
      certPath: cert.pfxFilePath,
      certPassword: password,
    })

    // Gera verificationUrl (mock: pode ser ajustado para buscar hash real)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/prescriptions/pdf/verify`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescricoes-${consultationId}.pdf"`,
        'X-Verification-Url': verificationUrl,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao assinar PDF de prescrições da consulta')
    return NextResponse.json(
      { error: 'Erro interno do servidor', timestamp: new Date().toISOString(), success: false },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
