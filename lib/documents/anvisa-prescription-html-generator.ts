/**
 * Gerador HTML de prescrições ANVISA (RDC 1.000/2025, Portaria 344/98)
 *
 * Layout 100% HTML/CSS puro, sem dependência de imagens PNG.
 * Replica fielmente os modelos oficiais da ANVISA:
 * - Notificação A (amarela), B/B2 (azul), C2-Retinóides (branca)
 * - Notificação de Receita de Talidomida (A4 branca)
 *
 * HTML → Gotenberg → PDF compatível com PAdES.
 */

import QRCode from 'qrcode'
import { numberToWords } from './validator'
import type { PrescriptionDocument, MedicationItem } from './types'

export type AnvisaPrescriptionType =
  | 'CONTROLLED_A'
  | 'CONTROLLED_B'
  | 'CONTROLLED_B2'
  | 'CONTROLLED_C1'
  | 'CONTROLLED_C2'
  | 'CONTROLLED_C4'
  | 'CONTROLLED_C5'
  | 'CONTROLLED_TALIDOMIDA'

const STRIP_TYPES: AnvisaPrescriptionType[] = [
  'CONTROLLED_A',
  'CONTROLLED_B',
  'CONTROLLED_B2',
  'CONTROLLED_C2',
]

const CONTROLE_ESPECIAL_TYPES: AnvisaPrescriptionType[] = [
  'CONTROLLED_C1',
  'CONTROLLED_C4',
  'CONTROLLED_C5',
]

export interface AnvisaPrescriptionHtmlOptions {
  prescriptionType: AnvisaPrescriptionType
  viaNumber?: number
  controlNumber?: string
  uf?: string
  expiresAt?: Date
  justification?: string
  buyerName?: string
  buyerDocument?: string
  buyerAddress?: string
  buyerCity?: string
  buyerState?: string
  buyerPhone?: string
  verificationUrl?: string
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCPF(cpf: string): string {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11) return cpf || ''
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDoctorCrm(doctor: { crm?: string; crmState?: string }): string {
  const crm = (doctor.crm || '').trim()
  const state = (doctor.crmState || '').trim().toUpperCase()
  if (!crm) return ''
  if (/^CRM\s*[-]?\s*/i.test(crm) || crm.includes(state)) return crm
  return state ? `CRM-${state} ${crm}` : `CRM ${crm}`
}

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function underline(value: string, minWidth = '120px'): string {
  if (!value || value.startsWith('_')) {
    return `<span style="display:inline-block;min-width:${minWidth};border-bottom:1px solid #000">&nbsp;</span>`
  }
  return `<span style="border-bottom:1px solid #000;padding:0 2px">${esc(value)}</span>`
}

function formatMedicationBlock(med: MedicationItem, index: number): string {
  const name = med.name ?? med.genericName ?? ''
  const concentration = med.concentration || ''
  const form = med.pharmaceuticalForm || ''
  const qty = med.quantity ?? 1
  const unit = med.unit || med.quantityUnit || 'unidade(s)'
  const words = med.quantityWritten || numberToWords(qty)
  const dosage = med.dosage || ''
  const frequency = med.frequency || ''
  const duration = med.duration || ''
  const instructions = med.instructions || ''

  const lines: string[] = []
  lines.push(`${index + 1}. ${esc(name)} ${esc(concentration)} - ${esc(form)}`)
  lines.push(`Quantidade: ${qty} (${words}) ${esc(unit)}`)
  const posParts = [dosage, frequency, duration].filter(Boolean).join(' ')
  if (posParts) lines.push(`Posologia: ${esc(posParts)}`)
  if (instructions) lines.push(esc(instructions))

  return lines.join('<br/>')
}

async function getQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'H', type: 'image/png', margin: 1, width: 60 })
}

// ─── Config por tipo ────────────────────────────────────────────────────────
interface StripConfig {
  bgColor: string
  borderColor: string
  letter: string
  title: string
  isRetinoides?: boolean
}

function getStripConfig(type: AnvisaPrescriptionType): StripConfig {
  switch (type) {
    case 'CONTROLLED_A':
      return { bgColor: '#F5E0A0', borderColor: '#000', letter: 'A', title: 'NOTIFICAÇÃO DE RECEITA' }
    case 'CONTROLLED_B':
      return { bgColor: '#B8D4E8', borderColor: '#000', letter: 'B', title: 'NOTIFICAÇÃO DE RECEITA' }
    case 'CONTROLLED_B2':
      return { bgColor: '#B8D4E8', borderColor: '#000', letter: 'B2', title: 'NOTIFICAÇÃO DE RECEITA' }
    case 'CONTROLLED_C2':
      return { bgColor: '#FFFFFF', borderColor: '#000', letter: '', title: 'NOTIFICAÇÃO DE RECEITA ESPECIAL\nRETINÓIDES SISTÊMICOS', isRetinoides: true }
    default:
      return { bgColor: '#F5E0A0', borderColor: '#000', letter: 'A', title: 'NOTIFICAÇÃO DE RECEITA' }
  }
}

// ─── Strip HTML (A, B, B2, C2) ─────────────────────────────────────────────
async function renderStripPage(
  doc: PrescriptionDocument,
  opts: AnvisaPrescriptionHtmlOptions,
): Promise<string> {
  const cfg = getStripConfig(opts.prescriptionType)
  const cpf = doc.patient.cpf || doc.patient.documentNumber || ''
  const crmStr = formatDoctorCrm(doc.doctor)
  const issueDate = doc.date || doc.issuedAt || new Date()
  const viaLabel = opts.viaNumber === 1
    ? '1ª via - Dispensação Farmácia'
    : opts.viaNumber === 2
      ? '2ª via - Devolução ao Paciente'
      : ''

  const medsHtml = doc.medications.map((m, i) =>
    `<div style="margin-bottom:3px">${formatMedicationBlock(m, i)}</div>`
  ).join('')

  const qrHtml = opts.verificationUrl
    ? `<img src="${await getQRDataUrl(opts.verificationUrl)}" style="width:14mm;height:14mm;position:absolute;bottom:2mm;right:2mm" alt="QR"/>`
    : ''

  const titleLines = cfg.title.split('\n')
  const titleHtml = titleLines.map(l => `<div>${esc(l)}</div>`).join('')

  const retinoidesWarning = cfg.isRetinoides ? `
    <div style="position:absolute;top:4mm;right:3mm;width:22mm;border:1.5px solid #000;padding:2px;text-align:center;font-size:6pt;line-height:1.2">
      <div style="font-size:14pt;font-weight:bold">⚠</div>
      <div style="font-weight:bold">GRAVIDEZ PROIBIDA</div>
      <div>Risco de graves defeitos na face, nas orelhas, no coração e no sistema nervoso do feto.</div>
    </div>` : ''

  return `
  <div class="strip-page" style="background-color:${cfg.bgColor}">
    <!-- Coluna 1: Notificação -->
    <div class="col col1">
      <div class="col1-header">
        ${titleHtml}
      </div>
      <div class="numero-row">
        <span class="numero-box">${esc(opts.controlNumber || '')}</span>
        ${cfg.letter ? `<span class="letra-tipo">${esc(cfg.letter)}</span>` : ''}
      </div>
      ${cfg.isRetinoides ? '' : `<div class="field-row" style="margin-top:2mm">UF: ${underline(opts.uf || doc.doctor.crmState || '', '30px')}</div>`}
      <div class="field-row">DATA: ${underline(formatDate(issueDate), '80px')}</div>
      <div class="sep-line"></div>
      <div class="field-label-sm">ASSINATURA E CARIMBO DO PRESCRITOR</div>
      <div class="field-row" style="margin-top:3mm"><b>PACIENTE:</b> ${underline(doc.patient.name, '100px')}</div>
      <div class="field-row">CPF: ${underline(formatCPF(cpf), '100px')}</div>
      ${cfg.isRetinoides ? `
        <div class="field-row">DATA DE NASCIMENTO: ${underline('', '60px')}</div>
        <div class="field-row">SEXO: ${underline('', '60px')}</div>
      ` : ''}
    </div>

    <!-- Coluna 2: Emitente + Comprador -->
    <div class="col col2">
      <div class="section-box emitente-box">
        <div class="section-title">IDENTIFICAÇÃO DO EMITENTE</div>
        <div class="emitente-content">
          <div>${esc(doc.doctor.name?.toUpperCase())} ${esc(crmStr)}</div>
          ${doc.doctor.specialty ? `<div>${esc(doc.doctor.specialty)}</div>` : ''}
          ${doc.doctor.clinicName ? `<div>${esc(doc.doctor.clinicName)}</div>` : ''}
          ${doc.doctor.phone ? `<div>Tel: ${esc(doc.doctor.phone)}</div>` : ''}
        </div>
      </div>
      <div class="section-box comprador-box">
        <div class="section-title">IDENTIFICAÇÃO DO COMPRADOR</div>
        <div class="comprador-content">
          <div class="field-row">Nome: ${underline(opts.buyerName || '', '120px')}</div>
          <div class="field-row">CPF: ${underline(opts.buyerDocument ? formatCPF(opts.buyerDocument) : '', '120px')}</div>
          <div class="field-row">Endereço: ${underline(opts.buyerAddress || '', '100px')}</div>
          <div class="field-row">Telefone: ${underline(opts.buyerPhone || '', '100px')}</div>
        </div>
      </div>
      <div class="footer-grafica">*NOME DA GRÁFICA, CNPJ E ENDEREÇO COMPLETO</div>
    </div>

    <!-- Coluna 3: Prescrição -->
    <div class="col col3">
      <div class="section-box prescricao-box">
        <div class="section-title">PRESCRIÇÃO</div>
        <div class="prescricao-content">
          ${medsHtml}
        </div>
      </div>
    </div>

    ${viaLabel ? `<div class="via-label">${viaLabel}</div>` : ''}
    ${retinoidesWarning}
    ${qrHtml}
  </div>`
}

// ─── Talidomida HTML (A4 page) ─────────────────────────────────────────────
async function renderTalidomidaPage(
  doc: PrescriptionDocument,
  opts: AnvisaPrescriptionHtmlOptions,
): Promise<string> {
  const cpf = doc.patient.cpf || doc.patient.documentNumber || ''
  const crmStr = formatDoctorCrm(doc.doctor)
  const issueDate = doc.date || doc.issuedAt || new Date()
  const viaLabel = opts.viaNumber === 1
    ? '(2 Vias) 1ª via: paciente; 2ª via: unidade pública dispensadora'
    : '2ª via - unidade pública dispensadora'

  const med = doc.medications[0]
  const qty = med?.quantity ?? 1
  const words = med?.quantityWritten || numberToWords(qty)
  const dosage = med?.dosage || ''
  const frequency = med?.frequency || ''
  const duration = med?.duration || ''
  const instructions = med?.instructions || ''
  const medName = med?.name ?? med?.genericName ?? ''
  const concentration = med?.concentration || ''
  const form = med?.pharmaceuticalForm || ''

  const qrHtml = opts.verificationUrl
    ? `<img src="${await getQRDataUrl(opts.verificationUrl)}" style="width:14mm;height:14mm;position:absolute;bottom:15mm;right:15mm" alt="QR"/>`
    : ''

  return `
  <div class="tali-page">
    <!-- Header -->
    <div class="tali-header">
      <div class="tali-header-left">
        <div class="tali-main-title">NOTIFICAÇÃO DE RECEITA DE TALIDOMIDA</div>
        <div class="tali-field-row">
          <span class="tali-box-label">NÚMERO</span>
          <span class="tali-box-value">${esc(opts.controlNumber || '')}</span>
        </div>
        <div class="tali-field-row">
          <span class="tali-box-label">CID</span>
          <span class="tali-box-value">&nbsp;</span>
        </div>
      </div>
      <div class="tali-header-right">
        <div class="tali-atencao">
          <div class="tali-atencao-icon">ATENÇÃO</div>
        </div>
        <div class="tali-warning">
          <div>"Proibida para mulheres grávidas ou com chance de engravidar"</div>
          <div style="margin-top:4px"><b>"Talidomida causa o nascimento de crianças sem braços e sem pernas"</b></div>
        </div>
      </div>
    </div>

    <!-- Seção 1: Identificação do Médico -->
    <div class="tali-section">
      <div class="tali-section-title">1 - IDENTIFICAÇÃO DO MÉDICO</div>
      <div class="tali-section-body">
        <div class="tali-row">Nome: ${underline(doc.doctor.name?.toUpperCase() || '', '250px')} Nº. do Cadastro: ${underline('', '100px')}</div>
        <div class="tali-row">Endereço: ${underline(doc.doctor.address || doc.doctor.clinicName || '', '380px')}</div>
        <div class="tali-row">Especialidade: ${underline(doc.doctor.specialty || '', '350px')}</div>
        <div class="tali-row">C.P.F.: ${underline('', '150px')} C.R.M.nº: ${underline(crmStr, '70px')} UF: ${underline(doc.doctor.crmState || '', '25px')}</div>
        <div class="tali-row">Data: ${underline(formatDate(issueDate), '70px')}</div>
        <div style="text-align:center;margin-top:2px;font-size:6.5pt">Assinatura e Carimbo</div>
      </div>
    </div>

    <!-- Seção 2: Identificação do Paciente -->
    <div class="tali-section">
      <div class="tali-section-title">2 – IDENTIFICAÇÃO DO PACIENTE</div>
      <div class="tali-section-body">
        <div class="tali-row">Nome: ${underline(doc.patient.name, '400px')}</div>
        <div class="tali-row">Data de Nascimento: ${underline('', '80px')} Sexo: ${underline('', '40px')} Telefone (se houver): ${underline('', '100px')}</div>
        <div class="tali-row">Endereço: ${underline(doc.patient.address || '', '380px')}</div>
        <div class="tali-row">CPF ou, se estrangeiro, PASSAPORTE: ${underline(formatCPF(cpf), '200px')}</div>
      </div>
    </div>

    <!-- Seção 3: Responsável pelo Paciente -->
    <div class="tali-section">
      <div class="tali-section-title">3 – IDENTIFICAÇÃO DO RESPONSÁVEL PELO PACIENTE (SE FOR O CASO)</div>
      <div class="tali-section-body">
        <div class="tali-row">Nome: ${underline('', '400px')}</div>
        <div class="tali-row">Endereço: ${underline('', '250px')} Telefone (se houver): ${underline('', '100px')}</div>
        <div class="tali-row">CPF ou, se estrangeiro, PASSAPORTE: ${underline('', '200px')}</div>
      </div>
    </div>

    <!-- Seção 4: Identificação do Medicamento -->
    <div class="tali-section">
      <div class="tali-section-title">4 – IDENTIFICAÇÃO DO MEDICAMENTO</div>
      <div class="tali-section-body">
        <div class="tali-row">Quantidade de comprimidos (em algarismos arábicos e por extenso): ${underline(`${qty} (${words})`, '180px')}</div>
        <div class="tali-row">Dose por Unidade Posológica (Ex.: 100mg): ${underline(`${esc(medName)} ${esc(concentration)} ${esc(form)}`, '180px')}</div>
        <div class="tali-row">Posologia: ${underline([dosage, frequency].filter(Boolean).join(' '), '300px')}</div>
        <div class="tali-row">Tempo de tratamento: ${underline(duration, '300px')}</div>
        <div class="tali-row">Outras orientações (se houver): ${underline(instructions, '280px')}</div>
      </div>
    </div>

    <!-- Seção 5: Dados sobre a Dispensação -->
    <div class="tali-section">
      <div class="tali-section-title">5 – DADOS SOBRE A DISPENSAÇÃO</div>
      <div class="tali-section-body">
        <div class="tali-row">Quantidade (Comprimidos.): ${underline('', '130px')} nº do lote: ${underline('', '80px')}</div>
        <div class="tali-row">Nome do Farmacêutico Dispensador: ${underline('', '170px')} CRF nº: ${underline('', '50px')}</div>
        <div style="text-align:center;margin-top:4px">
          <div style="border-top:1px solid #000;width:200px;margin:0 auto;padding-top:1px;font-size:6.5pt">Assinatura e Carimbo do Responsável Técnico</div>
          <div style="font-size:6.5pt;margin-top:1px">Data: _____ / _____ / _____</div>
        </div>
      </div>
    </div>

    <!-- Seção 6: Carimbo da Unidade -->
    <div class="tali-section">
      <div class="tali-section-title">6- CARIMBO DA UNIDADE PÚBLICA DISPENSADORA <span style="font-weight:normal">(nome, endereço completo e telefone)</span></div>
      <div class="tali-section-body" style="min-height:15mm">&nbsp;</div>
    </div>

    <div class="tali-footer">
      <div style="font-size:7pt;color:#444">Identificação da Gráfica: nome, endereço, CNPJ e nº da autorização concedida pela Autoridade Sanitária competente.</div>
      <div style="font-size:8pt;font-weight:bold;margin-top:3px">${esc(viaLabel)}</div>
    </div>

    ${qrHtml}
  </div>`
}

// ─── CSS ────────────────────────────────────────────────────────────────────
const ANVISA_STYLES = `
@page { margin: 0; size: A4; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 8pt; color: #000; }

/* ── Strip (A, B, B2, C2) ── */
.strip-page {
  width: 210mm;
  height: 75mm;
  border: 2px solid #000;
  position: relative;
  display: flex;
  page-break-after: always;
  overflow: hidden;
}
.strip-page:last-child { page-break-after: auto; }

.col { padding: 3mm; font-size: 7.5pt; line-height: 1.35; }
.col1 { width: 25%; border-right: 1.5px solid #000; }
.col2 { width: 40%; border-right: 1.5px solid #000; display: flex; flex-direction: column; }
.col3 { width: 35%; }

.col1-header { font-weight: bold; font-size: 8pt; text-align: center; margin-bottom: 2mm; line-height: 1.2; }
.numero-row { display: flex; align-items: center; gap: 3mm; margin-bottom: 1.5mm; }
.numero-box {
  border: 1px solid #000;
  padding: 1px 6px;
  min-width: 18mm;
  font-size: 7pt;
  display: inline-block;
}
.letra-tipo { font-size: 18pt; font-weight: bold; line-height: 1; }

.field-row { margin-bottom: 1mm; font-size: 7pt; }
.field-label-sm { font-size: 6pt; text-align: center; color: #333; margin-top: 1mm; }
.sep-line { border-top: 1px solid #000; margin: 2mm 0; }

.section-box { border: 1.5px solid #000; margin-bottom: 2mm; flex-shrink: 0; }
.section-title {
  font-weight: bold;
  font-size: 7.5pt;
  text-align: center;
  background: #fff;
  border-bottom: 1px solid #000;
  padding: 1px 4px;
}
.emitente-box .section-title,
.comprador-box .section-title,
.prescricao-box .section-title { background: transparent; }

.emitente-content { padding: 2mm; font-size: 7pt; line-height: 1.3; }
.comprador-content { padding: 2mm; font-size: 7pt; }
.comprador-content .field-row { margin-bottom: 1.5mm; }

.emitente-box { flex: 0 0 auto; }
.comprador-box { flex: 1; }

.prescricao-box { height: 100%; display: flex; flex-direction: column; }
.prescricao-content { padding: 2mm; font-size: 7pt; line-height: 1.35; flex: 1; overflow: hidden; }

.footer-grafica { font-size: 5.5pt; color: #555; text-align: center; margin-top: auto; padding-top: 1mm; }

.via-label {
  position: absolute;
  bottom: 2mm;
  right: 20mm;
  font-weight: bold;
  font-size: 7pt;
  color: #DC2626;
}

/* ── Talidomida (A4) ── */
.tali-page {
  width: 210mm;
  height: 297mm;
  padding: 6mm 10mm;
  position: relative;
  page-break-after: always;
  font-size: 7.5pt;
  line-height: 1.25;
}
.tali-page:last-child { page-break-after: auto; }

.tali-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border: 2px solid #000;
  padding: 2.5mm 3mm;
  margin-bottom: 2mm;
}
.tali-header-left { flex: 1; }
.tali-header-right { flex: 1; text-align: right; padding-left: 4mm; }
.tali-main-title { font-weight: bold; font-size: 9.5pt; margin-bottom: 2mm; }
.tali-box-label {
  display: inline-block;
  border: 1px solid #000;
  padding: 0.5px 4px;
  font-size: 7pt;
  font-weight: bold;
  min-width: 16mm;
  margin-right: 2mm;
}
.tali-box-value {
  display: inline-block;
  border: 1px solid #000;
  padding: 0.5px 4px;
  min-width: 32mm;
  font-size: 7pt;
}
.tali-field-row { margin-bottom: 1.2mm; }
.tali-atencao { margin-bottom: 1.5mm; }
.tali-atencao-icon {
  display: inline-block;
  border: 2px solid #000;
  border-radius: 50%;
  width: 14mm;
  height: 14mm;
  line-height: 14mm;
  text-align: center;
  font-weight: bold;
  font-size: 6pt;
}
.tali-warning { font-size: 7pt; text-align: right; line-height: 1.2; }

.tali-section { border: 1.5px solid #000; margin-bottom: 1.5mm; }
.tali-section-title {
  font-weight: bold;
  font-size: 7pt;
  padding: 1mm 2.5mm;
  background: #f0f0f0;
  border-bottom: 1px solid #000;
}
.tali-section-body { padding: 1.5mm 2.5mm; }
.tali-row { margin-bottom: 1.5mm; font-size: 7pt; }

.tali-footer { margin-top: 2mm; }
`

// ─── API pública ────────────────────────────────────────────────────────────

export async function generateAnvisaPrescriptionPages(
  doc: PrescriptionDocument,
  opts: AnvisaPrescriptionHtmlOptions,
): Promise<string> {
  const pages: string[] = []

  if (STRIP_TYPES.includes(opts.prescriptionType)) {
    pages.push(await renderStripPage(doc, { ...opts, viaNumber: 1 }))
    pages.push(await renderStripPage(doc, { ...opts, viaNumber: 2 }))
  } else if (opts.prescriptionType === 'CONTROLLED_TALIDOMIDA') {
    pages.push(await renderTalidomidaPage(doc, { ...opts, viaNumber: 1 }))
    pages.push(await renderTalidomidaPage(doc, { ...opts, viaNumber: 2 }))
  } else if (CONTROLE_ESPECIAL_TYPES.includes(opts.prescriptionType)) {
    throw new Error(`Tipo ${opts.prescriptionType} é renderizado por prescription-html-generator, não por este módulo.`)
  } else {
    throw new Error(`Tipo de prescrição não suportado: ${opts.prescriptionType}`)
  }

  return pages.join('\n')
}

export async function generateAnvisaPrescriptionHtml(
  doc: PrescriptionDocument,
  opts: AnvisaPrescriptionHtmlOptions,
): Promise<string> {
  const pages = await generateAnvisaPrescriptionPages(doc, opts)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Prescrição ANVISA - ${opts.prescriptionType}</title>
  <style>${ANVISA_STYLES}</style>
</head>
<body>
${pages}
</body>
</html>`
}

export function hasAnvisaTemplate(prescriptionType: string): prescriptionType is AnvisaPrescriptionType {
  return [
    'CONTROLLED_A', 'CONTROLLED_B', 'CONTROLLED_B2',
    'CONTROLLED_C1', 'CONTROLLED_C2', 'CONTROLLED_C4',
    'CONTROLLED_C5', 'CONTROLLED_TALIDOMIDA',
  ].includes(prescriptionType)
}
