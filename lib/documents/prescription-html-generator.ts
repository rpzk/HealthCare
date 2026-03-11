/**
 * Gerador HTML unificado de prescrições médicas
 *
 * Conforme modelos ANVISA (RDC 1.000/2025, RDC 471/21, Portaria 344/98):
 * - Receita Simples / Antimicrobiano: layout com seções IDENTIFICAÇÃO DO EMITENTE,
 *   IDENTIFICAÇÃO DO PACIENTE, PRESCRIÇÃO, DATA E ASSINATURA (estrutura CE)
 * - Controladas: usam anvisa-prescription-html-generator (templates oficiais)
 *
 * PDF gerado exclusivamente via Gotenberg.
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
  buyerCity?: string
  buyerState?: string
  buyerPhone?: string
  verificationUrl?: string
  /** Quando true, exibe carimbo do médico (fallback quando sem certificado digital) */
  useStamp?: boolean
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

function formatDoctorCrm(doctor: DoctorInfo): string {
  const crm = (doctor.crm || '').trim()
  const state = (doctor.crmState || '').trim().toUpperCase()
  if (!crm) return ''
  if (/^CRM\s*[-]?\s*/i.test(crm) || crm.includes(state)) return crm
  return state ? `CRM ${state} ${crm}` : `CRM ${crm}`
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

function resolveLogoDataUrl(doctor: DoctorInfo): string | undefined {
  if (!doctor.logoUrl) return undefined
  try {
    if (doctor.logoUrl.startsWith('data:')) return doctor.logoUrl
    let pathname: string | undefined
    try {
      const url = new URL(doctor.logoUrl)
      pathname = url.pathname
    } catch {
      pathname = doctor.logoUrl.startsWith('/') ? doctor.logoUrl : undefined
    }
    if (pathname) {
      const logoPath = path.join(process.cwd(), 'public', pathname.replace(/^\/+/, ''))
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        const ext = path.extname(logoPath).slice(1).toLowerCase()
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext || 'png'}`
        return `data:${mime};base64,${fileBuffer.toString('base64')}`
      }
      return doctor.logoUrl
    }
    return doctor.logoUrl
  } catch {
    return undefined
  }
}

function formatDateTimeFull(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' - ' + date.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }) + ' (GMT-3)'
}

/**
 * Receita Simples — layout limpo e profissional (estilo Memed)
 */
async function renderSimplePrescriptionPage(
  doc: PrescriptionDocument,
  opts: PrescriptionHtmlOptions,
): Promise<string> {
  const issuedAt = doc.issuedAt || doc.date || new Date()
  const doctor = doc.doctor
  const patient = doc.patient
  const logoDataUrl = resolveLogoDataUrl(doctor)
  const cpfPatient = patient.cpf || patient.documentNumber
  const usageType = doc.usageType || 'INTERNAL'
  const usageText =
    usageType === 'EXTERNAL' ? 'USO EXTERNO' :
    usageType === 'BOTH' ? 'USO INTERNO E EXTERNO' : 'USO INTERNO'

  const medicationsHtml = doc.medications
    .map((med, i) => {
      const qtyStr = formatMedicationQuantity(med, false)
      const posologyParts = [med.dosage, med.frequency, med.duration, med.instructions].filter(Boolean)
      const posology = posologyParts.join('. ')
      return `
        <div class="rx-medication">
          <div class="rx-med-line">
            <span class="rx-med-name">${i + 1}. ${escapeHtml(med.name || med.genericName)} ${escapeHtml(med.concentration || '')}</span>
            <span class="rx-med-dots"></span>
            <span class="rx-med-qty">${escapeHtml(qtyStr)}</span>
          </div>
          ${posology ? `<div class="rx-med-posology">${escapeHtml(posology)}</div>` : ''}
        </div>`
    })
    .join('')

  const qrDataUrl = opts.verificationUrl
    ? await generateQRDataUrl(opts.verificationUrl)
    : ''

  const crmFormatted = formatDoctorCrm(doctor)
  const specialtyText = doctor.specialty ? ` - ${escapeHtml(doctor.specialty)}` : ''

  return `
    <div class="page simple-page">
      <header class="rx-header">
        <div class="rx-header-left">
          ${logoDataUrl ? `<img src="${escapeHtml(logoDataUrl)}" alt="Logo" class="rx-logo" />` : ''}
          ${doctor.clinicName && !logoDataUrl ? `<span class="rx-clinic-name">${escapeHtml(doctor.clinicName)}</span>` : ''}
        </div>
        <div class="rx-header-right">
          <h1 class="rx-doctor-name">${escapeHtml(doctor.name)}</h1>
          <p class="rx-doctor-crm">${escapeHtml(crmFormatted)}${specialtyText}</p>
          ${doctor.rqe ? `<p class="rx-doctor-rqe">RQE ${escapeHtml(doctor.rqe)}</p>` : ''}
          ${doctor.address ? `<p class="rx-doctor-addr">${escapeHtml(doctor.address)}</p>` : ''}
          ${doctor.phone ? `<p class="rx-doctor-phone">${escapeHtml(doctor.phone)}</p>` : ''}
        </div>
      </header>

      <hr class="rx-divider" />

      <section class="rx-patient">
        <p><span class="rx-label">Nome:</span> ${escapeHtml(patient.name)}</p>
        ${cpfPatient ? `<p><span class="rx-label">CPF:</span> ${formatCPF(cpfPatient)}</p>` : ''}
        ${patient.birthDate ? `<p><span class="rx-label">Idade:</span> ${calculateAge(patient.birthDate)} anos</p>` : ''}
      </section>

      <section class="rx-body">
        <p class="rx-usage-type">${usageText}</p>
        <div class="rx-medications">${medicationsHtml}</div>
        ${doc.notes ? `<p class="rx-notes">${escapeHtml(doc.notes)}</p>` : ''}
      </section>

      <footer class="rx-footer">
        <div class="rx-footer-left">
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" alt="QR Code" class="rx-qr" />
            <div class="rx-verify-text">
              <p>Acesse a receita digital via QR Code</p>
              ${opts.verificationUrl ? `<p class="rx-verify-url">${escapeHtml(opts.verificationUrl)}</p>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="rx-footer-right">
          <p class="rx-date"><span class="rx-label">Data e hora:</span> ${formatDateTimeFull(issuedAt)}</p>
          <p class="rx-signed-by">${opts.useStamp
            ? `${escapeHtml(doctor.name)} • ${escapeHtml(crmFormatted)} • Emitido em: ${formatDate(issuedAt)}`
            : `Assinado digitalmente por: ${escapeHtml(doctor.name)} - ${escapeHtml(crmFormatted)}`}</p>
          <p class="rx-location">${escapeHtml(doctor.city || doctor.address || 'Brasil')}</p>
        </div>
      </footer>
    </div>`
}

/**
 * Receita Controlada (Controle Especial) — layout conforme modelo ANVISA CE
 * Barras centralizadas com títulos de seção, sem caixas grossas
 */
async function renderControlledPrescriptionPage(
  doc: PrescriptionDocument,
  opts: PrescriptionHtmlOptions,
  viaLabel: string | null
): Promise<string> {
  const medicationNames = doc.medications.map((m) => m.name || m.genericName)
  const prescriptionType: PrescriptionType =
    (opts.prescriptionType as PrescriptionType) ||
    classifyPrescriptionType(medicationNames)
  const needsQuantityInWords = requiresQuantityInWords(prescriptionType)
  const issuedAt = doc.issuedAt || doc.date || new Date()
  const expiresAt = opts.expiresAt || calculateExpirationDate(prescriptionType, issuedAt)
  const doctor = doc.doctor
  const patient = doc.patient
  const cpfPatient = patient.cpf || patient.documentNumber

  const title = (() => {
    switch (prescriptionType) {
      case 'CONTROLLED_C1': return 'RECEITA DE CONTROLE ESPECIAL'
      case 'CONTROLLED_C4': return 'RECEITA DE CONTROLE ESPECIAL - ANTIRRETROVIRAIS'
      case 'CONTROLLED_C5': return 'RECEITA DE CONTROLE ESPECIAL - ANABOLIZANTES'
      default: return 'RECEITA DE CONTROLE ESPECIAL'
    }
  })()

  const medicationsHtml = doc.medications
    .map((med, i) => {
      const qtyStr = formatMedicationQuantity(med, needsQuantityInWords)
      const posologyParts = [med.dosage, med.frequency, med.duration, med.instructions].filter(Boolean)
      const posology = posologyParts.join('. ')
      return `
        <div class="ce-med-item">
          <div class="ce-med-line">
            <span class="ce-med-name">${i + 1}. ${escapeHtml(med.name || med.genericName)} ${escapeHtml(med.concentration || '')}</span>
            <span class="ce-med-dots"></span>
            <span class="ce-med-qty">${escapeHtml(qtyStr)}</span>
          </div>
          ${posology ? `<div class="ce-med-posology">${escapeHtml(posology)}</div>` : ''}
        </div>`
    })
    .join('')

  const qrDataUrl = opts.verificationUrl
    ? await generateQRDataUrl(opts.verificationUrl)
    : ''

  const viaLabelAnvisa = viaLabel
    ? (viaLabel.startsWith('1') ? '1ª via - Retenção pela Farmácia / 2ª via - Paciente' : '2ª via - Paciente')
    : null

  return `
    <div class="page ce-page">
      <h1 class="ce-title">${escapeHtml(title)}</h1>

      <div class="ce-section-bar">IDENTIFICAÇÃO DO EMITENTE</div>
      <div class="ce-section-content">
        <p>${escapeHtml(doctor.name.toUpperCase())} ${formatDoctorCrm(doctor) ? `- ${escapeHtml(formatDoctorCrm(doctor))}` : ''}${doctor.specialty ? ` - ${escapeHtml(doctor.specialty)}` : ''}</p>
        <p class="ce-ou">OU</p>
        <p>${escapeHtml(doctor.clinicName || doctor.address || '')}${doctor.clinicCnpj ? ` - CNPJ: ${escapeHtml(doctor.clinicCnpj)}` : ''}${doctor.address ? ` - ${escapeHtml(doctor.address)}` : ''}${doctor.city ? ` - ${escapeHtml(doctor.city)} - ${escapeHtml(doctor.crmState)}` : ''}</p>
        ${doctor.phone ? `<p>TELEFONE: ${escapeHtml(doctor.phone)}</p>` : ''}
      </div>

      <div class="ce-section-bar">IDENTIFICAÇÃO DO PACIENTE</div>
      <div class="ce-section-content">
        <p>NOME COMPLETO: ${escapeHtml(patient.name)}</p>
        <p>CPF: ${cpfPatient ? formatCPF(cpfPatient) : '________________________________'}</p>
        ${patient.address ? `<p>ENDEREÇO: ${escapeHtml(patient.address)}</p>` : ''}
      </div>

      <div class="ce-section-bar">PRESCRIÇÃO</div>
      <div class="ce-section-content ce-prescricao-body">
        <div class="ce-medications">${medicationsHtml}</div>
        ${doc.notes ? `<p class="ce-notes">${escapeHtml(doc.notes)}</p>` : ''}
      </div>

      <div class="ce-footer-box">
        <p><strong>DATA:</strong> ${formatDate(issuedAt)} &nbsp;&nbsp;&nbsp; <strong>Validade:</strong> ${formatDate(expiresAt)}</p>
        <p><strong>IDENTIFICAÇÃO E ${opts.useStamp ? 'CARIMBO' : 'ASSINATURA'} DO PRESCRITOR:</strong></p>
        <p class="ce-signature-value">${opts.useStamp
          ? `${escapeHtml(doctor.name)} • ${escapeHtml(formatDoctorCrm(doctor))} • ${formatDate(issuedAt)}`
          : 'Documento assinado digitalmente'}</p>
      </div>

      <div class="ce-section-bar ce-comprador-bar">IDENTIFICAÇÃO DO COMPRADOR</div>
      <p class="ce-comprador-note">*IMPRESSÃO OPCIONAL - CONFORME PORTARIA Nº 6/99, ARTIGO 85, ALÍNEA C, ESSES DADOS PODEM SER APOSTOS MEDIANTE CARIMBO NO VERSO, PELA FARMÁCIA, NO MOMENTO DA DISPENSAÇÃO.</p>
      <div class="ce-comprador-fields">
        <p>NOME COMPLETO: ${escapeHtml(opts.buyerName || '________________________________')}</p>
        <p>CPF: ${opts.buyerDocument ? formatCPF(opts.buyerDocument) : '________________________________'}</p>
        <p>ENDEREÇO COMPLETO: ${escapeHtml(opts.buyerAddress || '________________________________')}</p>
        <p>CIDADE: ${escapeHtml(opts.buyerCity || '________________')} &nbsp;&nbsp; UF: ${escapeHtml(opts.buyerState || '____')}</p>
        <p>TELEFONE: ${escapeHtml(opts.buyerPhone || '________________________________')}</p>
      </div>

      ${viaLabelAnvisa ? `<p class="ce-via-label">${escapeHtml(viaLabelAnvisa)}</p>` : ''}
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" class="ce-qr-code" />` : ''}
    </div>`
}

/**
 * Receita de Antimicrobiano — layout profissional (2 vias, validade 10 dias)
 * Antimicrobianos usam receita branca comum com 2 vias (sem formulário especial ANVISA)
 */
async function renderAntimicrobialPrescriptionPage(
  doc: PrescriptionDocument,
  opts: PrescriptionHtmlOptions,
  viaLabel: string | null
): Promise<string> {
  const issuedAt = doc.issuedAt || doc.date || new Date()
  const expiresAt = opts.expiresAt || calculateExpirationDate('ANTIMICROBIAL', issuedAt)
  const doctor = doc.doctor
  const patient = doc.patient
  const logoDataUrl = resolveLogoDataUrl(doctor)
  const cpfPatient = patient.cpf || patient.documentNumber
  const crmFormatted = formatDoctorCrm(doctor)
  const specialtyText = doctor.specialty ? ` - ${escapeHtml(doctor.specialty)}` : ''

  const medicationsHtml = doc.medications
    .map((med, i) => {
      const qtyStr = formatMedicationQuantity(med, false)
      const posologyParts = [med.dosage, med.frequency, med.duration, med.instructions].filter(Boolean)
      const posology = posologyParts.join('. ')
      return `
        <div class="rx-medication">
          <div class="rx-med-line">
            <span class="rx-med-name">${i + 1}. ${escapeHtml(med.name || med.genericName)} ${escapeHtml(med.concentration || '')}</span>
            <span class="rx-med-dots"></span>
            <span class="rx-med-qty">${escapeHtml(qtyStr)}</span>
          </div>
          ${posology ? `<div class="rx-med-posology">${escapeHtml(posology)}</div>` : ''}
        </div>`
    })
    .join('')

  const qrDataUrl = opts.verificationUrl
    ? await generateQRDataUrl(opts.verificationUrl)
    : ''

  const viaLabelText = viaLabel
    ? (viaLabel.startsWith('1') ? '1ª VIA - RETENÇÃO DA FARMÁCIA' : '2ª VIA - ORIENTAÇÃO DO PACIENTE')
    : null

  return `
    <div class="page simple-page">
      ${viaLabelText ? `<div class="atb-via-label">${escapeHtml(viaLabelText)}</div>` : ''}

      <header class="rx-header">
        <div class="rx-header-left">
          ${logoDataUrl ? `<img src="${escapeHtml(logoDataUrl)}" alt="Logo" class="rx-logo" />` : ''}
          ${doctor.clinicName && !logoDataUrl ? `<span class="rx-clinic-name">${escapeHtml(doctor.clinicName)}</span>` : ''}
        </div>
        <div class="rx-header-right">
          <h1 class="rx-doctor-name">${escapeHtml(doctor.name)}</h1>
          <p class="rx-doctor-crm">${escapeHtml(crmFormatted)}${specialtyText}</p>
          ${doctor.rqe ? `<p class="rx-doctor-rqe">RQE ${escapeHtml(doctor.rqe)}</p>` : ''}
          ${doctor.address ? `<p class="rx-doctor-addr">${escapeHtml(doctor.address)}</p>` : ''}
          ${doctor.phone ? `<p class="rx-doctor-phone">${escapeHtml(doctor.phone)}</p>` : ''}
        </div>
      </header>

      <hr class="rx-divider" />

      <div class="atb-badge">RECEITA DE ANTIMICROBIANO — Validade: ${formatDate(expiresAt)} (10 dias)</div>

      <section class="rx-patient">
        <p><span class="rx-label">Nome:</span> ${escapeHtml(patient.name)}</p>
        ${cpfPatient ? `<p><span class="rx-label">CPF:</span> ${formatCPF(cpfPatient)}</p>` : ''}
        ${patient.address ? `<p><span class="rx-label">Endereço:</span> ${escapeHtml(patient.address)}</p>` : ''}
        ${patient.birthDate ? `<p><span class="rx-label">Idade:</span> ${calculateAge(patient.birthDate)} anos</p>` : ''}
      </section>

      <section class="rx-body">
        <div class="rx-medications">${medicationsHtml}</div>
        ${doc.notes ? `<p class="rx-notes">${escapeHtml(doc.notes)}</p>` : ''}
      </section>

      <footer class="rx-footer">
        <div class="rx-footer-left">
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" alt="QR Code" class="rx-qr" />
            <div class="rx-verify-text">
              <p>Acesse a receita digital via QR Code</p>
              ${opts.verificationUrl ? `<p class="rx-verify-url">${escapeHtml(opts.verificationUrl)}</p>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="rx-footer-right">
          <p class="rx-date"><span class="rx-label">Data e hora:</span> ${formatDateTimeFull(issuedAt)}</p>
          <p class="rx-signed-by">${opts.useStamp
            ? `${escapeHtml(doctor.name)} • ${escapeHtml(crmFormatted)} • Emitido em: ${formatDate(issuedAt)}`
            : `Assinado digitalmente por: ${escapeHtml(doctor.name)} - ${escapeHtml(crmFormatted)}`}</p>
          <p class="rx-location">${escapeHtml(doctor.city || doctor.address || 'Brasil')}</p>
        </div>
      </footer>
    </div>`
}

/* ─── CSS ─────────────────────────────────────────────────────────── */

const CSS_BASE = `
  @page { margin: 40pt 50pt; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
  .page { padding: 0; min-height: calc(100vh - 80pt); position: relative; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
`

const CSS_SIMPLE = `
  /* ─── Receita Simples (estilo profissional) ─── */
  .simple-page { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }

  .rx-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14pt; }
  .rx-header-left { flex-shrink: 0; }
  .rx-logo { max-height: 52pt; max-width: 160pt; object-fit: contain; }
  .rx-clinic-name { font-size: 10pt; color: #4B5563; font-weight: 600; }
  .rx-header-right { text-align: right; }
  .rx-doctor-name { font-family: Georgia, 'Times New Roman', serif; font-size: 16pt; font-weight: normal; font-style: italic; color: #1a7a8a; margin: 0 0 2pt 0; }
  .rx-doctor-crm { font-size: 9pt; color: #4B5563; margin: 0 0 1pt 0; }
  .rx-doctor-rqe { font-size: 8.5pt; color: #6B7280; margin: 0 0 1pt 0; }
  .rx-doctor-addr { font-size: 8pt; color: #9CA3AF; margin: 0 0 1pt 0; }
  .rx-doctor-phone { font-size: 8pt; color: #9CA3AF; margin: 0; }

  .rx-divider { border: none; border-top: 0.75pt solid #D1D5DB; margin: 0 0 16pt 0; }

  .rx-patient { margin-bottom: 20pt; }
  .rx-patient p { margin: 3pt 0; font-size: 10.5pt; }
  .rx-label { font-weight: bold; color: #374151; }

  .rx-body { flex: 1; }
  .rx-usage-type { font-size: 10pt; font-weight: bold; color: #374151; margin: 0 0 16pt 0; text-transform: uppercase; letter-spacing: 0.5pt; }

  .rx-medications { margin-bottom: 20pt; }
  .rx-medication { margin-bottom: 14pt; }
  .rx-med-line { display: flex; align-items: baseline; gap: 4pt; }
  .rx-med-name { font-size: 11pt; font-weight: bold; white-space: nowrap; }
  .rx-med-dots { flex: 1; border-bottom: 1pt dotted #9CA3AF; margin: 0 2pt; min-width: 20pt; position: relative; top: -3pt; }
  .rx-med-qty { font-size: 10pt; white-space: nowrap; color: #374151; }
  .rx-med-posology { font-size: 9.5pt; color: #4B5563; margin: 4pt 0 0 16pt; line-height: 1.5; }

  .rx-notes { font-size: 9pt; color: #6B7280; margin-top: 16pt; line-height: 1.4; border-left: 2pt solid #E5E7EB; padding-left: 10pt; }

  .rx-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.75pt solid #D1D5DB; padding-top: 14pt; margin-top: auto; }
  .rx-footer-left { display: flex; align-items: flex-end; gap: 8pt; }
  .rx-qr { width: 70px; height: 70px; }
  .rx-verify-text { font-size: 7pt; color: #9CA3AF; line-height: 1.3; }
  .rx-verify-text p { margin: 0 0 1pt 0; }
  .rx-verify-url { word-break: break-all; font-size: 6.5pt; }
  .rx-footer-right { text-align: right; }
  .rx-date { font-size: 9pt; color: #374151; margin: 0 0 3pt 0; }
  .rx-signed-by { font-size: 8pt; color: #6B7280; margin: 0 0 2pt 0; }
  .rx-location { font-size: 8pt; color: #9CA3AF; margin: 0; }
`

const CSS_CONTROLLED = `
  /* ─── Receita de Controle Especial (layout ANVISA CE) ─── */
  .ce-page { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .ce-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 0 0 18pt 0; letter-spacing: 1pt; }

  .ce-section-bar {
    border: 0.75pt solid #000; text-align: center; font-size: 9.5pt; font-weight: bold;
    padding: 3pt 0; margin: 14pt 0 0 0; background: transparent;
  }
  .ce-section-content { padding: 8pt 2pt; font-size: 10pt; line-height: 1.5; }
  .ce-section-content p { margin: 2pt 0; }
  .ce-ou { font-weight: bold; margin: 4pt 0 !important; }

  .ce-prescricao-body { min-height: 160pt; flex: 1; }
  .ce-medications { margin-bottom: 12pt; }
  .ce-med-item { margin-bottom: 12pt; }
  .ce-med-line { display: flex; align-items: baseline; gap: 4pt; }
  .ce-med-name { font-size: 11pt; font-weight: bold; white-space: nowrap; }
  .ce-med-dots { flex: 1; border-bottom: 1pt dotted #9CA3AF; margin: 0 2pt; min-width: 20pt; position: relative; top: -3pt; }
  .ce-med-qty { font-size: 10pt; white-space: nowrap; }
  .ce-med-posology { font-size: 9.5pt; color: #374151; margin: 3pt 0 0 16pt; line-height: 1.4; }
  .ce-notes { font-size: 9pt; color: #6B7280; margin-top: 8pt; }

  .ce-footer-box { border: 0.75pt solid #000; padding: 8pt 10pt; margin-top: 18pt; font-size: 10pt; }
  .ce-footer-box p { margin: 3pt 0; }
  .ce-signature-value { font-size: 9pt; color: #4B5563; }

  .ce-comprador-bar { margin-top: 20pt; }
  .ce-comprador-note { font-size: 7pt; color: #555; line-height: 1.3; margin: 4pt 0 8pt 0; font-style: italic; }
  .ce-comprador-fields { font-size: 10pt; line-height: 2; }
  .ce-comprador-fields p { margin: 0; }

  .ce-via-label { text-align: right; font-size: 9pt; font-style: italic; color: #666; margin-top: 12pt; }
  .ce-qr-code { position: absolute; bottom: 10pt; right: 0; width: 70px; height: 70px; }

  /* ─── Antimicrobiano (badge + via) ─── */
  .atb-via-label { text-align: center; font-size: 9pt; font-weight: bold; color: #DC2626; margin-bottom: 10pt; letter-spacing: 0.5pt; }
  .atb-badge { font-size: 9pt; font-weight: 600; color: #92400e; background: #fef3c7; border: 0.75pt solid #f59e0b; border-radius: 3pt; padding: 4pt 10pt; margin-bottom: 14pt; text-align: center; }
`

function wrapHtmlDocument(pages: string[], includeSimple: boolean): string {
  const hasControlled = pages.some(p => p.includes('ce-page') || p.includes('anvisa-style'))
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Prescrição Médica</title>
  <style>${CSS_BASE}${includeSimple ? CSS_SIMPLE : ''}${hasControlled ? CSS_CONTROLLED : ''}</style>
</head>
<body>
  ${pages.join('\n  ')}
</body>
</html>`
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
  const controlledByType: Partial<Record<PrescriptionType, MedicationItem[]>> = {}

  for (const med of doc.medications) {
    const medType = classifyMedication(med.name || med.genericName)
    if (medType === 'ANTIMICROBIAL') {
      antimicrobials.push(med)
    } else if (medType === 'SIMPLE') {
      simple.push(med)
    } else {
      if (!controlledByType[medType]) controlledByType[medType] = []
      controlledByType[medType]!.push(med)
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

  // Se por algum motivo não houver grupos (fallback)
  if (groups.length === 0) {
    const medicationNames = doc.medications.map((m) => m.name || m.genericName)
    const prescriptionType: PrescriptionType =
      (opts.prescriptionType as PrescriptionType) ||
      classifyPrescriptionType(medicationNames)

    if (prescriptionType === 'SIMPLE') {
      const page = await renderSimplePrescriptionPage(doc, opts)
      return wrapHtmlDocument([page], true)
    }

    if (prescriptionType === 'ANTIMICROBIAL') {
      const page1 = await renderAntimicrobialPrescriptionPage(doc, opts, '1ª VIA')
      const page2 = await renderAntimicrobialPrescriptionPage(doc, opts, '2ª VIA')
      return wrapHtmlDocument([page1, page2], true)
    }

    const twoVias = requiresTwoVias(prescriptionType)
    const via1Label = twoVias ? '1ª VIA' : null
    const via2Label = twoVias ? '2ª VIA' : null
    const page1 = await renderControlledPrescriptionPage(doc, { ...opts, prescriptionType }, via1Label)
    const page2 = twoVias ? await renderControlledPrescriptionPage(doc, { ...opts, prescriptionType }, via2Label) : ''
    return wrapHtmlDocument(twoVias ? [page1, page2] : [page1], false)
  }

  const pages: string[] = []
  let hasSimple = false

  for (const group of groups) {
    const groupDoc: PrescriptionDocument = {
      ...doc,
      medications: group.medications,
    }

    const prescriptionType = group.type

    if (prescriptionType === 'SIMPLE') {
      hasSimple = true
      const page = await renderSimplePrescriptionPage(groupDoc, opts)
      pages.push(page)
      continue
    }

    if (prescriptionType === 'ANTIMICROBIAL') {
      hasSimple = true
      const page1 = await renderAntimicrobialPrescriptionPage(groupDoc, opts, '1ª VIA')
      const page2 = await renderAntimicrobialPrescriptionPage(groupDoc, opts, '2ª VIA')
      pages.push(page1, page2)
      continue
    }

    const twoVias = requiresTwoVias(prescriptionType)
    const via1Label = twoVias ? '1ª VIA' : null
    const via2Label = twoVias ? '2ª VIA' : null

    const baseOpts: PrescriptionHtmlOptions = {
      ...opts,
      prescriptionType,
    }

    const page1 = await renderControlledPrescriptionPage(groupDoc, baseOpts, via1Label)
    pages.push(page1)

    if (twoVias) {
      const page2 = await renderControlledPrescriptionPage(groupDoc, baseOpts, via2Label)
      pages.push(page2)
    }
  }

  const hasSimpleOrAtb = hasSimple || groups.some(g => g.type === 'SIMPLE' || g.type === 'ANTIMICROBIAL')
  return wrapHtmlDocument(pages, hasSimpleOrAtb)
}
