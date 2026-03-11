/**
 * GET /api/exam-requests/[id]/pdf
 *
 * Gera PDF de solicitação de exames, agrupando por paciente + data de criação
 * (como nas prescrições). Exames do mesmo paciente na mesma data vão no mesmo PDF.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { convertHtmlToPdf } from '@/lib/pdf-signing-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'

export const runtime = 'nodejs'

const formatCpf = (cpf?: string | null) => {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const URGENCY_LABELS: Record<string, string> = {
  ROUTINE: 'Rotina',
  URGENT: 'Urgente',
  EMERGENCY: 'Emergência',
}

async function buildExamsPdfHtml(examId: string) {
  const exam = await prisma.examRequest.findUnique({
    where: { id: examId },
    include: {
      patient: { select: { id: true, name: true, cpf: true } },
      doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
    },
  })

  if (!exam) return null

  const requestDate = new Date(exam.requestDate)
  const startOfDay = new Date(requestDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(requestDate)
  endOfDay.setHours(23, 59, 59, 999)

  const grouped = await prisma.examRequest.findMany({
    where: {
      patientId: exam.patientId,
      requestDate: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      patient: { select: { id: true, name: true, cpf: true } },
      doctor: { select: { id: true, name: true, crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true } },
    },
  })

  const patient = grouped[0]?.patient || exam.patient
  const doctor = grouped[0]?.doctor || exam.doctor

  let rawCpf: string | null = null
  try {
    rawCpf = patient?.cpf ? decrypt(patient.cpf) : null
  } catch {
    // CPF pode não estar criptografado
  }
  const cpfFormatted = formatCpf(rawCpf || patient?.cpf || null)

  const doctorRegistration = doctor?.crmNumber
    ? `CRM: ${doctor.crmNumber}`
    : doctor?.licenseNumber
      ? `${doctor.licenseType || 'Registro'}: ${doctor.licenseNumber}${doctor.licenseState ? `-${doctor.licenseState}` : ''}`
      : null

  const dateLabel = requestDate.toLocaleDateString('pt-BR')

  // Indicação única (primeira não vazia, sem repetir por exame)
  const uniqueIndications = [...new Set(grouped.map(e => (e.description || '').trim()).filter(Boolean))]
  const singleIndication = uniqueIndications[0] || ''

  let html = `<html><head><meta charset='utf-8'><title>Solicitação de Exames</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { text-align: center; color: #333; }
    .info { margin-bottom: 20px; }
    .indication-block { margin: 20px 0; padding: 12px; background: #f8f9fa; border-left: 4px solid #333; }
    ol { margin-top: 20px; }
    li { margin-bottom: 12px; }
    .signature-box { margin-top: 50px; text-align: center; }
    .signature-line { border-top: 1px solid #000; padding-top: 12px; margin-top: 60px; font-size: 12px; }
    .carimbo { font-size: 11px; color: #444; margin-top: 4px; }
    .footer { margin-top: 30px; font-size: 11px; color: #666; }
  </style>
  </head><body>`

  html += `<h1>SOLICITAÇÃO DE EXAMES</h1>`
  html += `<div class="info"><p><b>Paciente:</b> ${patient?.name || '—'}`
  if (cpfFormatted) html += ` | CPF: ${cpfFormatted}`
  html += `</p></div>`
  html += `<div class="info"><p><b>Médico:</b> ${doctor?.name || '—'}`
  if (doctorRegistration) html += ` | ${doctorRegistration}`
  html += `</p></div>`
  html += `<div class="info"><p><b>Data:</b> ${dateLabel}</p></div>`

  if (singleIndication) {
    html += `<div class="indication-block"><b>Indicação clínica:</b> ${singleIndication}</div>`
  }

  html += `<p style="margin-top: 16px;"><b>Exames solicitados:</b></p><ol>`
  for (const e of grouped) {
    const title = e.examType || e.description || 'Exame'
    const urgencyLabel = URGENCY_LABELS[e.urgency] || e.urgency
    html += `<li><b>${title}</b>`
    if (e.urgency) html += ` | ${urgencyLabel}`
    html += `</li>`
  }
  html += `</ol>`

  html += `<div class="signature-box">
    <div class="signature-line">
      <em>___________________________________________</em><br/>
      <span style="font-size: 11px;">Assinatura do médico</span><br/>
      <strong>${doctor?.name || '—'}</strong><br/>
      ${doctorRegistration ? `<span class="carimbo">${doctorRegistration}</span>` : ''}
    </div>
  </div>`
  html += `<p class="footer">Solicitação emitida em ${dateLabel}. Documento gerado pelo sistema HealthCare.</p>`
  html += `</body></html>`

  return html
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

    const html = await buildExamsPdfHtml(examId)
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
    return NextResponse.json(
      { error: 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
})
