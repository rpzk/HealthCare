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
    // Busca consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { select: { id: true, name: true, cpf: true } },
        doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
        examRequests: true,
      },
    })
    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }
    // Formatadores auxiliares
    const formatCpf = (cpf?: string | null) => {
      if (!cpf) return null
      const digits = cpf.replace(/\D/g, '')
      if (digits.length !== 11) return cpf
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    const rawCpf = consultation.patient?.cpf ? decrypt(consultation.patient.cpf) : null
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
    // Monta HTML do exame
    let html = `<html><head><meta charset='utf-8'><title>Solicitação de Exames</title></head><body>`
    html += `<h1 style='text-align:center'>SOLICITAÇÃO DE EXAMES</h1>`
    html += `<p><b>Paciente:</b> ${consultation.patient?.name || '—'}`
    if (cpfFormatted) html += ` | CPF: ${cpfFormatted}`
    html += `</p>`
    html += `<p><b>Médico:</b> ${consultation.doctor?.name || '—'}`
    if (doctorRegistration) html += ` | ${doctorRegistration}`
    html += `</p>`
    html += `<ol>`
    const list = consultation.examRequests || []
    if (list.length === 0) {
      html += `<li>Nenhuma solicitação de exame registrada nesta consulta.</li>`
    } else {
      for (const [idx, e] of list.entries()) {
        const title = e.description || e.examType || 'Exame'
        html += `<li><b>${title}</b>`
        if (e.examType) html += ` | Tipo: ${e.examType}`
        if (e.urgency) html += ` | Urgência: ${e.urgency}`
        if (e.status) html += ` | Status: ${e.status}`
        html += `</li>`
      }
    }
    html += `</ol>`
    if (consultationDateLabel) {
      html += `<p style='margin-top:32px'>Consulta: ${consultation.id} • ${consultationDateLabel}</p>`
    } else {
      html += `<p style='margin-top:32px'>Consulta: ${consultation.id}</p>`
    }
    html += `</body></html>`

    // Assina via Gotenberg com certificado do usuário
    const pdf = await signPdfWithGotenberg({
      html,
      filename: `exames-${consultationId}.pdf`,
      certPath: cert.pfxFilePath,
      certPassword: password,
    })

    // Gera verificationUrl
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/exams/pdf/verify`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="exames-${consultationId}.pdf"`,
        'X-Verification-Url': verificationUrl,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    logger.error({ err }, 'Erro ao gerar PDF de exames')
    return NextResponse.json({ error: err.message || 'Erro ao gerar PDF de exames' }, { status: 500 })
  }
})
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'

export const runtime = 'nodejs'


export const GET = withDoctorAuth(async (req: NextRequest, { params, user }: { params: any, user: any }) => {
  try {
    const consultationId = params.id
    const shouldStamp = req.nextUrl.searchParams.get('stamp') === '1'
    // Busca consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { select: { id: true, name: true, cpf: true } },
        doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
        examRequests: true,
      },
    })
    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }
    // Formatadores auxiliares
    const formatCpf = (cpf?: string | null) => {
      if (!cpf) return null
      const digits = cpf.replace(/\D/g, '')
      if (digits.length !== 11) return cpf
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    const rawCpf = consultation.patient?.cpf ? decrypt(consultation.patient.cpf) : null
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
    // Monta HTML do exame
    let html = `<html><head><meta charset='utf-8'><title>Solicitação de Exames</title></head><body>`
    html += `<h1 style='text-align:center'>SOLICITAÇÃO DE EXAMES</h1>`
    html += `<p><b>Paciente:</b> ${consultation.patient?.name || '—'}`
    if (cpfFormatted) html += ` | CPF: ${cpfFormatted}`
    html += `</p>`
    html += `<p><b>Médico:</b> ${consultation.doctor?.name || '—'}`
    if (doctorRegistration) html += ` | ${doctorRegistration}`
    html += `</p>`
    html += `<ol>`
    const list = consultation.examRequests || []
    if (list.length === 0) {
      html += `<li>Nenhuma solicitação de exame registrada nesta consulta.</li>`
    } else {
      for (const [idx, e] of list.entries()) {
        const title = e.description || e.examType || 'Exame'
        html += `<li><b>${title}</b>`
        if (e.examType) html += ` | Tipo: ${e.examType}`
        if (e.urgency) html += ` | Urgência: ${e.urgency}`
        if (e.status) html += ` | Status: ${e.status}`
        html += `</li>`
      }
    }
    html += `</ol>`
    if (consultationDateLabel) {
      html += `<p style='margin-top:32px'>Consulta: ${consultation.id} • ${consultationDateLabel}</p>`
    } else {
      html += `<p style='margin-top:32px'>Consulta: ${consultation.id}</p>`
    }
    html += `</body></html>`

    // Assina via Gotenberg
    const pdf = await signPdfWithGotenberg({ html, filename: `exames-${consultationId}.pdf` })

    // Gera verificationUrl
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/exams/pdf/verify`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="exames-${consultationId}.pdf"`,
        'X-Verification-Url': verificationUrl,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao gerar PDF de exames da consulta')
    return NextResponse.json(
      { error: 'Erro interno do servidor', timestamp: new Date().toISOString(), success: false },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

