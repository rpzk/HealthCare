/**
 * Gerador HTML unificado de prescrições médicas
 *
 * Padrão ANVISA/CFM. Layout único para receita simples, antimicrobiana e controlada.
 * PDF gerado exclusivamente via Gotenberg (sem fallback).
 *
 * Especificações:
 * - Margens: 50pt em todos os lados
 * - Cabeçalho centralizado, Helvetica-Bold 16pt
 * - CRM/Especialidade 10pt cinza #4B5563
 * - Paciente: 11pt, endereço/idade se antimicrobiano ou controlada
 * - USO INTERNO / USO EXTERNO: 12pt centralizado
 * - Medicamentos: nome+dosagem 11pt bold, quantidade à direita, posologia 10pt indent 20pt
 * - Rodapé: "Documento assinado digitalmente", data/local, QR 80x80
 * - Sem página em branco desnecessária
 */

import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { numberToWords } from './validator'
import {
  PrescriptionDocument,
  MedicationItem,
  DoctorInfo,
  PatientInfo,
} from './types'
import {
  classifyMedication,
  classifyPrescriptionType,
  calculateExpirationDate,
  requiresQuantityInWords,
  requiresTwoVias,
} from './prescription-classifier'
import type { PrescriptionType } from '@prisma/client'

export interface PrescriptionHtmlOptions {
  prescriptionType?: PrescriptionType
  viaNumber?: number
  expiresAt?: Date
  controlNumber?: string
  uf?: string
  justification?: string
  buyerName?: string
  buyerDocument?: string
  buyerAddress?: string
  buyerPhone?: string
  verificationUrl?: string
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCPF(cpf: string): string {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11) return cpf || ''
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    width: 80,
  })
}

function formatMedicationQuantity(
  med: MedicationItem,
  needsWords: boolean
): string {
  const qty = med.quantity ?? 1
  const unit = med.unit || med.quantityUnit || 'unidade(s)'
  if (needsWords) {
    const words = med.quantityWritten || numberToWords(qty)
    return `${qty} (${words}) ${unit}`
  }
  return `${qty} ${unit}`
}

/**
 * Gera o HTML de uma página de prescrição (uma via)
 */
async function renderPrescriptionPage(
  doc: PrescriptionDocument,
  opts: PrescriptionHtmlOptions,
  viaLabel: string | null
): Promise<string> {
  const medicationNames = doc.medications.map((m) => m.name || m.genericName)
  const prescriptionType: PrescriptionType =
    (opts.prescriptionType as PrescriptionType) ||
    classifyPrescriptionType(medicationNames)
  const needsQuantityInWords = requiresQuantityInWords(prescriptionType)
  const usageType = doc.usageType || 'INTERNAL'
  const usageText =
    usageType === 'EXTERNAL' ? 'USO EXTERNO' :
    usageType === 'BOTH' ? 'USO INTERNO E EXTERNO' : 'USO INTERNO'
  const issuedAt = doc.issuedAt || doc.date || new Date()
  const expiresAt =
    opts.expiresAt || calculateExpirationDate(prescriptionType, issuedAt)

  const doctor = doc.doctor
  const patient = doc.patient

  let logoDataUrl: string | undefined = undefined
  if (doctor.logoUrl) {
    try {
      if (doctor.logoUrl.startsWith('data:')) {
        logoDataUrl = doctor.logoUrl
      } else {
        let pathname: string | undefined
        try {
          const url = new URL(doctor.logoUrl)
          pathname = url.pathname
        } catch {
          pathname = doctor.logoUrl.startsWith('/') ? doctor.logoUrl : undefined
        }

        if (pathname) {
          const logoPath = path.join(
            process.cwd(),
            'public',
            pathname.replace(/^\/+/, '')
          )
          if (fs.existsSync(logoPath)) {
            const fileBuffer = fs.readFileSync(logoPath)
            const ext = path.extname(logoPath).slice(1).toLowerCase()
            const mime =
              ext === 'svg'
                ? 'image/svg+xml'
                : `image/${ext === 'jpg' ? 'jpeg' : ext || 'png'}`
            logoDataUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`
          } else {
            logoDataUrl = doctor.logoUrl
          }
        } else {
          logoDataUrl = doctor.logoUrl
        }
      }
    } catch {
      logoDataUrl = undefined
    }
  }

  const patientDetails: string[] = []
  const needsPatientDetails =
    prescriptionType === 'ANTIMICROBIAL' ||
    requiresQuantityInWords(prescriptionType)
  if (needsPatientDetails) {
    if (patient.address) patientDetails.push(escapeHtml(patient.address))
    if (patient.birthDate) {
      const age = calculateAge(patient.birthDate)
      patientDetails.push(
        `${formatDate(patient.birthDate)} (${age} anos)`
      )
    }
  }

  const medicationsHtml = doc.medications
    .map((med, i) => {
      const classification = classifyMedication(med.name || med.genericName)
      const qtyStr = formatMedicationQuantity(med, needsQuantityInWords)
      const posologyParts = [
        med.dosage,
        med.frequency,
        med.duration,
        med.instructions,
      ].filter(Boolean)
      const posology = posologyParts.join('. ')
      return `
        <div class="medication">
          <div class="medication-header">
            <span class="medication-name">${i + 1}. ${escapeHtml(med.name || med.genericName)} ${escapeHtml(med.concentration || '')}</span>
            <span class="medication-quantity">${escapeHtml(qtyStr)}</span>
          </div>
          <div class="medication-posology">${escapeHtml(posology)}</div>
        </div>
      `
    })
    .join('')

  const qrDataUrl = opts.verificationUrl
    ? await generateQRDataUrl(opts.verificationUrl)
    : ''

  const pageClass = (() => {
    switch (prescriptionType) {
      case 'CONTROLLED_A':
        return 'page-anvisa-a'
      case 'CONTROLLED_B':
      case 'CONTROLLED_B2':
        return 'page-anvisa-b'
      case 'CONTROLLED_C1':
      case 'CONTROLLED_C4':
      case 'CONTROLLED_C5':
        return 'page-anvisa-ce'
      case 'CONTROLLED_C2':
        return 'page-anvisa-retinoides'
      case 'CONTROLLED_TALIDOMIDA':
        return 'page-anvisa-talidomida'
      default:
        return ''
    }
  })()

  return `
    <div class="page${pageClass ? ' ' + pageClass : ''}">
      ${viaLabel ? `<div class="via-label">${escapeHtml(viaLabel)}</div>` : ''}

      <header class="prescription-header">
        ${logoDataUrl ? `<div class="clinic-logo"><img src="${escapeHtml(logoDataUrl)}" alt="Logo" /></div>` : ''}
        ${doctor.clinicName ? `<p class="clinic-name">${escapeHtml(doctor.clinicName)}</p>` : ''}
        <h1>${escapeHtml(doctor.name)}</h1>
        <p class="doctor-meta">CRM ${escapeHtml(doctor.crmState)} ${escapeHtml(doctor.crm)}${doctor.specialty ? ` · ${escapeHtml(doctor.specialty)}` : ''}</p>
        <p class="doctor-contact">${[doctor.address, doctor.phone].filter(Boolean).map(escapeHtml).join(' · ')}</p>
        <hr class="header-separator" />
      </header>

      <section class="patient-section">
        <p><strong>Paciente:</strong> ${escapeHtml(patient.name)}</p>
        ${patientDetails.length ? `<p class="patient-details">${patientDetails.join(' · ')}</p>` : ''}
      </section>

      <section class="usage-section">
        <p class="usage-type">${usageText}</p>
      </section>

      <section class="medications-section">
        ${medicationsHtml}
      </section>

      ${doc.notes ? `<section class="notes-section"><p>${escapeHtml(doc.notes)}</p></section>` : ''}

      <footer class="prescription-footer">
        <p class="signature-line">Documento assinado digitalmente</p>
        <p class="date-location">${escapeHtml((doctor.city || 'Brasil') + ', ' + formatDate(issuedAt))}</p>
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" class="qr-code" />` : ''}
      </footer>
    </div>
  `
}

/**
 * Gera HTML completo da prescrição (1 ou 2 vias conforme tipo)
 */
export async function generatePrescriptionHtml(
  doc: PrescriptionDocument,
  opts: PrescriptionHtmlOptions = {}
): Promise<string> {
  // Agrupar medicamentos por tipo de receita ANVISA
  const groups: Array<{ type: PrescriptionType; medications: MedicationItem[] }> = []

  const simple: MedicationItem[] = []
  const antimicrobials: MedicationItem[] = []
  const controlledByType: Record<PrescriptionType, MedicationItem[]> = {}

  for (const med of doc.medications) {
    const medType = classifyMedication(med.name || med.genericName)
    if (medType === 'ANTIMICROBIAL') {
      antimicrobials.push(med)
    } else if (medType === 'SIMPLE') {
      simple.push(med)
    } else {
      if (!controlledByType[medType]) controlledByType[medType] = []
      controlledByType[medType].push(med)
    }
  }

  // Ordem: controlados (mais restritivos), depois antimicrobianos, depois simples
  const controlledOrder: PrescriptionType[] = [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_B2',
    'CONTROLLED_C5',
    'CONTROLLED_C4',
    'CONTROLLED_C2',
    'CONTROLLED_TALIDOMIDA',
    'CONTROLLED_C1',
  ]

  for (const t of controlledOrder) {
    const meds = controlledByType[t]
    if (meds && meds.length > 0) {
      groups.push({ type: t, medications: meds })
    }
  }

  if (antimicrobials.length > 0) {
    groups.push({ type: 'ANTIMICROBIAL', medications: antimicrobials })
  }

  if (simple.length > 0) {
    groups.push({ type: 'SIMPLE', medications: simple })
  }

  // Se por algum motivo não houver grupos (fallback), usa comportamento antigo
  if (groups.length === 0) {
    const medicationNames = doc.medications.map((m) => m.name || m.genericName)
    const prescriptionType: PrescriptionType =
      (opts.prescriptionType as PrescriptionType) ||
      classifyPrescriptionType(medicationNames)
    const twoVias = requiresTwoVias(prescriptionType)

    const via1Label = twoVias ? '1ª VIA - RETENÇÃO DA FARMÁCIA' : null
    const via2Label = twoVias ? '2ª VIA - ORIENTAÇÃO DO PACIENTE' : null

    const page1 = await renderPrescriptionPage(doc, opts, via1Label)
    const page2 =
      twoVias ? await renderPrescriptionPage(doc, opts, via2Label) : ''

    const pagesFallback = twoVias ? [page1, page2] : [page1]

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Prescrição Médica</title>
  <style>
    @page { margin: 50pt; size: A4; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #111;
    }
    .page {
      margin: 50pt;
      min-height: calc(100vh - 100pt);
      position: relative;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .page-anvisa-a {
      background-image: url('/anvisa-modelos/receita_a-1.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: contain;
    }
    .page-anvisa-b {
      background-image: url('/anvisa-modelos/receita_b-1.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: contain;
    }
    .page-anvisa-ce {
      background-image: url('/anvisa-modelos/receita_ce-1.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: contain;
    }
    .page-anvisa-retinoides {
      background-image: url('/anvisa-modelos/receita_retinoides-1.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: contain;
    }
    .page-anvisa-talidomida {
      background-image: url('/anvisa-modelos/receita_talidomida-1.png');
      background-repeat: no-repeat;
      background-position: top center;
      background-size: contain;
    }
    .via-label {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20pt;
      color: #4B5563;
    }
    .prescription-header {
      text-align: center;
      margin-bottom: 24pt;
    }
    .prescription-header .clinic-logo {
      margin-bottom: 12pt;
      display: flex;
      justify-content: center;
    }
    .prescription-header .clinic-logo img {
      max-height: 48pt;
      max-width: 180pt;
      object-fit: contain;
    }
    .prescription-header .clinic-name {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #4B5563;
      margin: 0 0 8pt 0;
      font-weight: 600;
    }
    .prescription-header h1 {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .doctor-meta {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #4B5563;
      margin: 0 0 4pt 0;
    }
    .doctor-contact {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #4B5563;
      margin: 0 0 12pt 0;
    }
    .header-separator {
      border: none;
      border-top: 1pt solid #E5E7EB;
      margin: 0;
    }
    .patient-section {
      margin-bottom: 20pt;
      font-size: 11pt;
    }
    .patient-section strong { font-weight: bold; }
    .patient-details {
      font-size: 9pt;
      color: #4B5563;
      margin: 4pt 0 0 0;
    }
    .usage-section {
      margin: 20pt 0;
      text-align: center;
    }
    .usage-type {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 12pt;
      font-weight: bold;
      margin: 0;
    }
    .medications-section {
      margin-bottom: 40pt;
    }
    .medication {
      margin-bottom: 15pt;
    }
    .medication-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4pt;
    }
    .medication-name {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .medication-quantity {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .medication-posology {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #4B5563;
      margin-left: 20pt;
      line-height: 1.4;
    }
    .notes-section {
      font-size: 9pt;
      color: #6B7280;
      margin-bottom: 24pt;
    }
    .prescription-footer {
      position: absolute;
      bottom: 0;
      left: 50pt;
      right: 50pt;
      padding-top: 20pt;
      border-top: 1pt solid #E5E7EB;
    }
    .signature-line {
      font-size: 9pt;
      color: #4B5563;
      margin: 0 0 4pt 0;
    }
    .date-location {
      font-size: 9pt;
      color: #4B5563;
      margin: 0;
    }
    .qr-code {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 80px;
      height: 80px;
    }
  </style>
</head>
<body>
  ${pagesFallback.join('\n  ')}
</body>
</html>`
  }

  const pages: string[] = []

  for (const group of groups) {
    const groupDoc: PrescriptionDocument = {
      ...doc,
      medications: group.medications,
    }

    const prescriptionType = group.type
    const twoVias = requiresTwoVias(prescriptionType)

    const via1Label = twoVias ? '1ª VIA - RETENÇÃO DA FARMÁCIA' : null
    const via2Label = twoVias ? '2ª VIA - ORIENTAÇÃO DO PACIENTE' : null

    const baseOpts: PrescriptionHtmlOptions = {
      ...opts,
      prescriptionType,
    }

    const page1 = await renderPrescriptionPage(groupDoc, baseOpts, via1Label)
    pages.push(page1)

    if (twoVias) {
      const page2 = await renderPrescriptionPage(groupDoc, baseOpts, via2Label)
      pages.push(page2)
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Prescrição Médica</title>
  <style>
    @page { margin: 50pt; size: A4; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #111;
    }
    .page {
      margin: 50pt;
      min-height: calc(100vh - 100pt);
      position: relative;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .via-label {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20pt;
      color: #4B5563;
    }
    .prescription-header {
      text-align: center;
      margin-bottom: 24pt;
    }
    .prescription-header .clinic-logo {
      margin-bottom: 12pt;
      display: flex;
      justify-content: center;
    }
    .prescription-header .clinic-logo img {
      max-height: 48pt;
      max-width: 180pt;
      object-fit: contain;
    }
    .prescription-header .clinic-name {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #4B5563;
      margin: 0 0 8pt 0;
      font-weight: 600;
    }
    .prescription-header h1 {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .doctor-meta {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #4B5563;
      margin: 0 0 4pt 0;
    }
    .doctor-contact {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #4B5563;
      margin: 0 0 12pt 0;
    }
    .header-separator {
      border: none;
      border-top: 1pt solid #E5E7EB;
      margin: 0;
    }
    .patient-section {
      margin-bottom: 20pt;
      font-size: 11pt;
    }
    .patient-section strong { font-weight: bold; }
    .patient-details {
      font-size: 9pt;
      color: #4B5563;
      margin: 4pt 0 0 0;
    }
    .usage-section {
      margin: 20pt 0;
      text-align: center;
    }
    .usage-type {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 12pt;
      font-weight: bold;
      margin: 0;
    }
    .medications-section {
      margin-bottom: 40pt;
    }
    .medication {
      margin-bottom: 15pt;
    }
    .medication-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4pt;
    }
    .medication-name {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .medication-quantity {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .medication-posology {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #4B5563;
      margin-left: 20pt;
      line-height: 1.4;
    }
    .notes-section {
      font-size: 9pt;
      color: #6B7280;
      margin-bottom: 24pt;
    }
    .prescription-footer {
      position: absolute;
      bottom: 0;
      left: 50pt;
      right: 50pt;
      padding-top: 20pt;
      border-top: 1pt solid #E5E7EB;
    }
    .signature-line {
      font-size: 9pt;
      color: #4B5563;
      margin: 0 0 4pt 0;
    }
    .date-location {
      font-size: 9pt;
      color: #4B5563;
      margin: 0;
    }
    .qr-code {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 80px;
      height: 80px;
    }
  </style>
</head>
<body>
  ${pages.join('\n  ')}
</body>
</html>`
}
