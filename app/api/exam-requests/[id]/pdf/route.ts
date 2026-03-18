/**
 * GET /api/exam-requests/[id]/pdf
 *
 * Gera PDF de solicitação de exames com layout profissional alinhado
 * ao padrão visual das prescrições (cabeçalho do médico, branding da clínica,
 * QR code de verificação, rodapé com assinatura).
 *
 * Exames do mesmo paciente na mesma data são agrupados em um único documento.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { convertHtmlToPdf } from '@/lib/pdf-signing-service'
import { getClinicDataForDocuments } from '@/lib/branding-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'
import {
  escapeHtml,
  formatCpf,
  formatDoctorLine,
  formatDateBr,
  generateQRDataUrl,
  resolveLogoToDataUrl,
  buildHeaderHtml,
  buildFooterHtml,
  wrapDocument,
} from '@/lib/documents/medical-doc-html'

const URGENCY_LABELS: Record<string, string> = {
  ROUTINE: 'Rotina',
  URGENT: 'Urgente',
  EMERGENCY: 'Emergência',
}

const URGENCY_CSS_CLASS: Record<string, string> = {
  ROUTINE: 'rotina',
  URGENT: 'urgente',
  EMERGENCY: 'emergencia',
}

async function buildExamsHtml(examId: string, userId: string): Promise<string | null> {
  // Carrega o exame solicitado para obter paciente/médico/data
  const exam = await prisma.examRequest.findUnique({
    where: { id: examId },
    include: {
      patient: { select: { id: true, name: true, cpf: true, birthDate: true } },
      doctor: {
        select: {
          id: true, name: true, email: true,
          crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true,
          speciality: true,
        },
      },
    },
  })

  if (!exam) return null

  // Agrupar todos os exames do mesmo paciente no mesmo dia
  const requestDate = new Date(exam.requestDate)
  const startOfDay = new Date(requestDate); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(requestDate); endOfDay.setHours(23, 59, 59, 999)

  const grouped = await prisma.examRequest.findMany({
    where: {
      patientId: exam.patientId,
      doctorId: exam.doctorId,
      requestDate: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'asc' },
  })

  const patient = exam.patient
  const doctor = exam.doctor

  // CPF descriptografado
  let rawCpf: string | null = null
  try { rawCpf = patient?.cpf ? decrypt(patient.cpf) : null } catch { rawCpf = patient?.cpf || null }

  // Dados do médico e clínica
  const { crm: doctorCrm, specialty: doctorSpecialty } = formatDoctorLine(doctor)
  const clinic = await getClinicDataForDocuments()
  const logoDataUrl = resolveLogoToDataUrl(clinic.logoUrl)

  const addrParts = [clinic.clinicAddress, clinic.clinicCity, clinic.clinicState].filter(Boolean)
  const clinicAddress = addrParts.length
    ? addrParts.join(', ') + (clinic.clinicZipCode ? ` - CEP ${clinic.clinicZipCode}` : '')
    : undefined

  // QR de verificação: usa assinatura digital se disponível, senão aponta pro exam-id
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
  const signedDoc = await prisma.signedDocument.findFirst({
    where: { documentType: 'EXAM_REQUEST', documentId: examId },
    orderBy: { signedAt: 'desc' },
  })
  const verificationUrl = signedDoc?.signatureHash
    ? `${baseUrl}/verify/${signedDoc.signatureHash}`
    : undefined
  const qrDataUrl = verificationUrl ? await generateQRDataUrl(verificationUrl) : undefined

  // Indicação clínica única (evita repetição)
  const uniqueIndications = [...new Set(grouped.map(e => (e.description || '').trim()).filter(Boolean))]
  const indication = uniqueIndications[0] || ''

  // ─── Construção do HTML ─────────────────────────────────────────────────

  const headerHtml = buildHeaderHtml({
    doctorName: doctor.name,
    doctorCrm,
    doctorSpecialty,
    clinicAddress,
    clinicPhone: clinic.clinicPhone || undefined,
    clinicName: clinic.clinicName || undefined,
    logoDataUrl,
  })

  const patientSection = `
    <section class="doc-patient">
      <p><span class="doc-label">Paciente:</span> ${escapeHtml(patient?.name || '—')}</p>
      ${rawCpf ? `<p><span class="doc-label">CPF:</span> ${formatCpf(rawCpf)}</p>` : ''}
      ${patient?.birthDate ? `<p><span class="doc-label">Data de nascimento:</span> ${formatDateBr(patient.birthDate)}</p>` : ''}
    </section>`

  const indicationBlock = indication
    ? `<div class="doc-indication">
         <div class="doc-indication-label">Indicação clínica</div>
         <div class="doc-indication-text">${escapeHtml(indication)}</div>
       </div>`
    : ''

  const examsHtml = grouped.map(e => {
    const examName = e.examType || e.description || 'Exame'
    const urgencyLabel = URGENCY_LABELS[e.urgency] || e.urgency
    const urgencyClass = URGENCY_CSS_CLASS[e.urgency] || 'rotina'
    return `
      <li class="doc-exam-item">
        <span class="doc-exam-name">${escapeHtml(examName)}</span>
        <span class="doc-exam-urgency ${urgencyClass}">${escapeHtml(urgencyLabel)}</span>
      </li>`
  }).join('')

  const bodyHtml = `
    <section class="doc-body">
      ${indicationBlock}
      <p class="doc-section-title" style="margin-top:0">Exames solicitados</p>
      <ul class="doc-exam-list">${examsHtml}</ul>
    </section>`

  const footerHtml = buildFooterHtml({
    doctorName: doctor.name,
    doctorCrm,
    issuedAt: requestDate,
    clinicCity: clinic.clinicCity || undefined,
    qrDataUrl,
    verificationUrl,
    useStamp: !signedDoc,
  })

  const page = `
    <div class="page">
      ${headerHtml}
      <p class="doc-title">SOLICITAÇÃO DE EXAMES</p>
      ${patientSection}
      ${bodyHtml}
      ${footerHtml}
    </div>`

  return wrapDocument([page], 'Solicitação de Exames')
}

export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  try {
    const examId = params?.id
    if (!examId) {
      return NextResponse.json({ error: 'ID do exame é obrigatório' }, { status: 400 })
    }

    const exam = await prisma.examRequest.findUnique({
      where: { id: examId },
      include: { patient: true, doctor: true },
    })
    if (!exam) {
      return NextResponse.json({ error: 'Exame não encontrado' }, { status: 404 })
    }
    if (exam.doctorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const html = await buildExamsHtml(examId, user.id)
    if (!html) {
      return NextResponse.json({ error: 'Erro ao montar PDF' }, { status: 500 })
    }

    const pdf = await convertHtmlToPdf(html)
    const patientName = (exam.patient?.name || 'exames').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="solicitacao-exames-${patientName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, examId: params?.id, userId: user?.id }, 'Erro ao gerar PDF de exames')
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
})
