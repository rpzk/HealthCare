/**
 * GET /api/referrals/[id]/pdf
 *
 * Gera PDF de encaminhamento médico com layout profissional alinhado
 * ao padrão visual das prescrições (cabeçalho do médico, branding da clínica,
 * QR code de verificação, rodapé com assinatura).
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

const PRIORITY_LABELS: Record<string, string> = {
  ROUTINE: 'Rotina',
  NORMAL: 'Rotina',
  URGENT: 'Urgente',
  EMERGENCY: 'Emergência',
}

const PRIORITY_CSS_CLASS: Record<string, string> = {
  ROUTINE: 'rotina',
  NORMAL: 'rotina',
  URGENT: 'urgente',
  EMERGENCY: 'emergencia',
}

async function buildReferralHtml(referralId: string): Promise<string | null> {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: {
      patient: { select: { id: true, name: true, cpf: true, birthDate: true } },
      doctor: {
        select: {
          id: true, name: true, email: true,
          crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true,
          speciality: true,
        },
      },
      destinationUnit: { select: { name: true, address: true } },
      destinationDoctor: { select: { name: true, crmNumber: true, licenseState: true, speciality: true } },
      targetOccupation: { select: { title: true } },
    },
  })

  if (!referral) return null

  const patient = referral.patient
  const doctor = referral.doctor

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

  // QR de verificação
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
  const signedDoc = await prisma.signedDocument.findFirst({
    where: { documentType: 'REFERRAL', documentId: referralId },
    orderBy: { signedAt: 'desc' },
  })
  const verificationUrl = signedDoc?.signatureHash
    ? `${baseUrl}/verify/${signedDoc.signatureHash}`
    : undefined
  const qrDataUrl = verificationUrl ? await generateQRDataUrl(verificationUrl) : undefined

  // Especialidade de destino
  const targetSpecialty = referral.targetOccupation?.title || referral.specialty || '—'

  // Prioridade
  const priorityLabel = PRIORITY_LABELS[referral.priority] || referral.priority
  const priorityClass = PRIORITY_CSS_CLASS[referral.priority] || 'rotina'

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

  // Destino
  const destLines: string[] = [`<p><span class="doc-label">Especialidade:</span> ${escapeHtml(targetSpecialty)}</p>`]
  if (referral.destinationDoctor) {
    const { crm: destCrm } = formatDoctorLine(referral.destinationDoctor)
    destLines.push(`<p><span class="doc-label">Profissional:</span> ${escapeHtml(referral.destinationDoctor.name)}${destCrm ? ` — ${escapeHtml(destCrm)}` : ''}</p>`)
  }
  if (referral.destinationUnit) {
    const unitStr = referral.destinationUnit.address
      ? `${referral.destinationUnit.name} — ${referral.destinationUnit.address}`
      : referral.destinationUnit.name
    destLines.push(`<p><span class="doc-label">Unidade:</span> ${escapeHtml(unitStr)}</p>`)
  }

  const destinationBlock = `
    <p class="doc-section-title">Encaminhamento para</p>
    <div class="doc-destination">
      ${destLines.join('\n')}
    </div>
    <span class="doc-priority ${priorityClass}">Prioridade: ${escapeHtml(priorityLabel)}</span>`

  // Motivo / descrição clínica
  const reasonBlock = `
    <div class="doc-indication" style="margin-top: 16pt;">
      <div class="doc-indication-label">Motivo do encaminhamento</div>
      <div class="doc-indication-text">${escapeHtml(referral.description)}</div>
    </div>`

  // Notas / observações adicionais
  const notesBlock = referral.notes
    ? `<div class="doc-indication" style="margin-top: 10pt; border-left-color: #9CA3AF;">
         <div class="doc-indication-label">Observações</div>
         <div class="doc-indication-text">${escapeHtml(referral.notes)}</div>
       </div>`
    : ''

  const bodyHtml = `
    <section class="doc-body">
      ${destinationBlock}
      ${reasonBlock}
      ${notesBlock}
    </section>`

  const footerHtml = buildFooterHtml({
    doctorName: doctor.name,
    doctorCrm,
    issuedAt: new Date(),
    clinicCity: clinic.clinicCity || undefined,
    qrDataUrl,
    verificationUrl,
    useStamp: !signedDoc,
  })

  const page = `
    <div class="page">
      ${headerHtml}
      <p class="doc-title">ENCAMINHAMENTO MÉDICO</p>
      ${patientSection}
      ${bodyHtml}
      ${footerHtml}
    </div>`

  return wrapDocument([page], 'Encaminhamento Médico')
}

export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID do encaminhamento é obrigatório' }, { status: 400 })
    }

    const referral = await prisma.referral.findUnique({
      where: { id: String(id) },
      select: { id: true, doctorId: true, patient: { select: { name: true } } },
    })
    if (!referral) {
      return NextResponse.json({ error: 'Encaminhamento não encontrado' }, { status: 404 })
    }
    if (referral.doctorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const html = await buildReferralHtml(String(id))
    if (!html) {
      return NextResponse.json({ error: 'Erro ao montar PDF' }, { status: 500 })
    }

    const pdf = await convertHtmlToPdf(html)
    const patientName = (referral.patient?.name || 'encaminhamento').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="encaminhamento-${patientName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, referralId: params?.id, userId: user?.id }, 'Erro ao gerar PDF de encaminhamento')
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
})
