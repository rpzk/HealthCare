import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { signPdfWithGotenberg, convertHtmlToPdf } from '@/lib/pdf-signing-service'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'

export const runtime = 'nodejs'

// Helper para formatar CPF
const formatCpf = (cpf?: string | null) => {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Helper para montar HTML de encaminhamentos
async function buildReferralsHtml(consultationId: string, userId: string, userRole: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      patient: { select: { id: true, name: true, cpf: true } },
      doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
      originReferrals: {
        where: { consultationId },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  
  if (!consultation) return { error: 'not_found' }

  if (consultation.doctorId !== userId && userRole !== 'ADMIN') {
    return { error: 'unauthorized' }
  }

  let rawCpf = null
  try {
    rawCpf = consultation.patient?.cpf ? decrypt(consultation.patient.cpf) : null
  } catch {
    // CPF pode não estar criptografado
  }
  const cpfFormatted = formatCpf(rawCpf || consultation.patient?.cpf || null)
  
  const doctorRegistration = consultation.doctor?.crmNumber
    ? `CRM: ${consultation.doctor.crmNumber}`
    : consultation.doctor?.licenseNumber
      ? `${consultation.doctor.licenseType || 'Registro'}: ${consultation.doctor.licenseNumber}${consultation.doctor.licenseState ? `-${consultation.doctor.licenseState}` : ''}`
      : null
      
  const consultationDate = consultation.actualDate || consultation.scheduledDate
  const consultationDateLabel = consultationDate
    ? new Date(consultationDate).toLocaleDateString('pt-BR')
    : null

  let html = `<html><head><meta charset='utf-8'><title>Encaminhamentos</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { text-align: center; color: #333; }
    .info { margin-bottom: 20px; }
    ol { margin-top: 20px; }
    li { margin-bottom: 10px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
  </head><body>`
  html += `<h1>ENCAMINHAMENTOS</h1>`
  html += `<div class="info"><p><b>Paciente:</b> ${consultation.patient?.name || '—'}`
  if (cpfFormatted) html += ` | CPF: ${cpfFormatted}`
  html += `</p></div>`
  html += `<div class="info"><p><b>Médico:</b> ${consultation.doctor?.name || '—'}`
  if (doctorRegistration) html += ` | ${doctorRegistration}`
  html += `</p></div>`
  html += `<ol>`
  
  const list = consultation.originReferrals || []
  if (list.length === 0) {
    html += `<li>Nenhum encaminhamento registrado nesta consulta.</li>`
  } else {
    for (const r of list) {
      html += `<li><b>${r.specialty || 'Encaminhamento'}</b>`
      if (r.priority) html += ` | Prioridade: ${r.priority}`
      if (r.status) html += ` | Status: ${r.status}`
      if (r.description) html += ` | Descrição: ${r.description}`
      html += `</li>`
    }
  }
  html += `</ol>`
  
  if (consultationDateLabel) {
    html += `<p class="footer">Consulta: ${consultation.id} • ${consultationDateLabel}</p>`
  } else {
    html += `<p class="footer">Consulta: ${consultation.id}</p>`
  }
  html += `</body></html>`

  return { html, consultation }
}

// GET: Gera PDF sem assinatura digital
export const GET = withDoctorAuth(async (req: NextRequest, { params, user }: { params: Record<string, string>, user: any }) => {
  try {
    const consultationId = params.id
    const result = await buildReferralsHtml(consultationId, user.id, user.role)
    
    if ('error' in result) {
      if (result.error === 'not_found') {
        return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
      }
      if (result.error === 'unauthorized') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
      }
    }

    const { html } = result as { html: string }

    // Gera PDF sem assinatura via Gotenberg
    const pdf = await convertHtmlToPdf(html)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="encaminhamentos-${consultationId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao gerar PDF de encaminhamentos da consulta')
    return NextResponse.json(
      { error: 'Erro interno do servidor', timestamp: new Date().toISOString(), success: false },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// POST: Recebe { password } no body para assinar com certificado A1
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

    // Monta HTML usando helper
    const result = await buildReferralsHtml(consultationId, user.id, user.role)
    
    if ('error' in result) {
      if (result.error === 'not_found') {
        return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
      }
      if (result.error === 'unauthorized') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
      }
    }

    const { html } = result as { html: string }

    // Assina via Gotenberg com certificado do usuário
    const pdf = await signPdfWithGotenberg({
      html,
      filename: `encaminhamentos-${consultationId}.pdf`,
      certPath: cert.pfxFilePath,
      certPassword: password,
    })

    // Gera verificationUrl
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/referrals/pdf/verify`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="encaminhamentos-${consultationId}.pdf"`,
        'X-Verification-Url': verificationUrl,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao assinar PDF de encaminhamentos da consulta')
    return NextResponse.json(
      { error: 'Erro interno do servidor', timestamp: new Date().toISOString(), success: false },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
