/**
 * Gerador HTML compartilhado para documentos médicos não-prescrição
 * (Solicitações de Exame, Encaminhamentos)
 *
 * Layout e CSS alinhados com prescription-html-generator.ts para
 * consistência visual entre todos os documentos emitidos pelo sistema.
 */

import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

// ─── Utilitários ───────────────────────────────────────────────────────────

export function escapeHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatDoctorLine(doctor: {
  name: string
  crmNumber?: string | null
  licenseNumber?: string | null
  licenseType?: string | null
  licenseState?: string | null
  speciality?: string | null
}): { crm: string; specialty: string } {
  const state = (doctor.licenseState || '').toUpperCase()
  const crm = doctor.crmNumber
    ? `CRM ${state ? `${state} ` : ''}${doctor.crmNumber}`
    : doctor.licenseNumber
      ? `${doctor.licenseType || 'Registro'}: ${doctor.licenseNumber}${state ? `-${state}` : ''}`
      : ''
  return { crm, specialty: doctor.speciality || '' }
}

export function formatDateBr(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatDateTimeBr(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' - ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }) +
    ' (GMT-3)'
}

export async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    width: 80,
  })
}

export function resolveLogoToDataUrl(logoUrl: string | null | undefined): string | undefined {
  if (!logoUrl) return undefined
  try {
    if (logoUrl.startsWith('data:')) return logoUrl
    let pathname: string | undefined
    try { pathname = new URL(logoUrl).pathname } catch { pathname = logoUrl.startsWith('/') ? logoUrl : undefined }
    if (pathname) {
      const absPath = path.join(process.cwd(), 'public', pathname.replace(/^\/+/, ''))
      if (fs.existsSync(absPath)) {
        const buf = fs.readFileSync(absPath)
        const ext = path.extname(absPath).slice(1).toLowerCase()
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext || 'png'}`
        return `data:${mime};base64,${buf.toString('base64')}`
      }
    }
    return logoUrl
  } catch { return undefined }
}

// ─── CSS ───────────────────────────────────────────────────────────────────

export const CSS_MEDICAL_DOC = `
  @page { margin: 40pt 50pt; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
  .page { padding: 0; min-height: calc(100vh - 80pt); position: relative; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }

  /* ─── Header (mesmo layout da receita simples) ─── */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14pt; }
  .doc-header-left { flex-shrink: 0; }
  .doc-logo { max-height: 52pt; max-width: 160pt; object-fit: contain; }
  .doc-clinic-name { font-size: 10pt; color: #4B5563; font-weight: 600; }
  .doc-header-right { text-align: right; }
  .doc-doctor-name { font-family: Georgia, 'Times New Roman', serif; font-size: 16pt; font-weight: normal; font-style: italic; color: #1a7a8a; margin: 0 0 2pt 0; }
  .doc-doctor-crm { font-size: 9pt; color: #4B5563; margin: 0 0 1pt 0; }
  .doc-doctor-specialty { font-size: 8.5pt; color: #6B7280; margin: 0 0 1pt 0; }
  .doc-doctor-addr { font-size: 8pt; color: #9CA3AF; margin: 0 0 1pt 0; }
  .doc-doctor-phone { font-size: 8pt; color: #9CA3AF; margin: 0; }

  .doc-divider { border: none; border-top: 0.75pt solid #D1D5DB; margin: 0 0 16pt 0; }

  /* ─── Título do documento ─── */
  .doc-title { text-align: center; font-size: 14pt; font-weight: bold; letter-spacing: 0.5pt; margin: 0 0 16pt 0; color: #111; }
  .doc-title-badge { display: inline-block; font-size: 9pt; font-weight: 600; padding: 2pt 10pt; border-radius: 3pt; margin-bottom: 12pt; }
  .doc-title-badge.urgente { color: #92400e; background: #fef3c7; border: 0.75pt solid #f59e0b; }
  .doc-title-badge.emergencia { color: #7f1d1d; background: #fee2e2; border: 0.75pt solid #ef4444; }

  /* ─── Seção de paciente ─── */
  .doc-patient { margin-bottom: 16pt; }
  .doc-patient p { margin: 3pt 0; font-size: 10.5pt; }
  .doc-label { font-weight: bold; color: #374151; }

  /* ─── Corpo ─── */
  .doc-body { flex: 1; }

  /* ─── Bloco de indicação clínica / motivo ─── */
  .doc-indication { margin: 0 0 16pt 0; padding: 10pt 12pt; background: #f8f9fa; border-left: 3pt solid #6B7280; }
  .doc-indication-label { font-weight: bold; font-size: 9.5pt; color: #374151; margin-bottom: 4pt; }
  .doc-indication-text { font-size: 10pt; line-height: 1.5; }

  /* ─── Lista de exames ─── */
  .doc-exam-list { margin: 0 0 16pt 0; padding-left: 0; list-style: none; }
  .doc-exam-item { display: flex; justify-content: space-between; align-items: baseline; padding: 8pt 0; border-bottom: 0.5pt solid #E5E7EB; }
  .doc-exam-item:last-child { border-bottom: none; }
  .doc-exam-name { font-size: 11pt; font-weight: 600; }
  .doc-exam-urgency { font-size: 8.5pt; font-weight: 600; padding: 1.5pt 7pt; border-radius: 3pt; white-space: nowrap; }
  .doc-exam-urgency.rotina { color: #374151; background: #F3F4F6; }
  .doc-exam-urgency.urgente { color: #92400e; background: #fef3c7; }
  .doc-exam-urgency.emergencia { color: #7f1d1d; background: #fee2e2; }

  /* ─── Bloco de destino / encaminhamento ─── */
  .doc-section-title { font-size: 10pt; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.5pt; margin: 0 0 6pt 0; border-bottom: 0.75pt solid #E5E7EB; padding-bottom: 4pt; }
  .doc-destination { margin-bottom: 16pt; font-size: 10.5pt; line-height: 1.7; }
  .doc-priority { display: inline-block; font-size: 9pt; font-weight: 700; padding: 2pt 10pt; border-radius: 3pt; margin-bottom: 12pt; }
  .doc-priority.rotina { color: #374151; background: #F3F4F6; }
  .doc-priority.urgente { color: #92400e; background: #fef3c7; border: 0.75pt solid #f59e0b; }
  .doc-priority.emergencia { color: #7f1d1d; background: #fee2e2; border: 0.75pt solid #ef4444; }

  /* ─── Footer (mesmo que receita) ─── */
  .doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.75pt solid #D1D5DB; padding-top: 14pt; margin-top: auto; }
  .doc-footer-left { display: flex; align-items: flex-end; gap: 8pt; }
  .doc-qr { width: 70px; height: 70px; }
  .doc-verify-text { font-size: 7pt; color: #9CA3AF; line-height: 1.3; }
  .doc-verify-text p { margin: 0 0 1pt 0; }
  .doc-verify-url { word-break: break-all; font-size: 6.5pt; }
  .doc-footer-right { text-align: right; }
  .doc-footer-date { font-size: 9pt; color: #374151; margin: 0 0 3pt 0; }
  .doc-footer-signed { font-size: 8pt; color: #6B7280; margin: 0 0 2pt 0; }
  .doc-footer-location { font-size: 8pt; color: #9CA3AF; margin: 0; }
`

// ─── Construtores de blocos HTML ───────────────────────────────────────────

export function buildHeaderHtml(opts: {
  doctorName: string
  doctorCrm: string
  doctorSpecialty?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicName?: string
  logoDataUrl?: string
}): string {
  const { doctorName, doctorCrm, doctorSpecialty, clinicAddress, clinicPhone, clinicName, logoDataUrl } = opts
  return `
    <header class="doc-header">
      <div class="doc-header-left">
        ${logoDataUrl ? `<img src="${escapeHtml(logoDataUrl)}" alt="Logo" class="doc-logo" />` : ''}
        ${clinicName && !logoDataUrl ? `<span class="doc-clinic-name">${escapeHtml(clinicName)}</span>` : ''}
      </div>
      <div class="doc-header-right">
        <h1 class="doc-doctor-name">${escapeHtml(doctorName)}</h1>
        ${doctorCrm ? `<p class="doc-doctor-crm">${escapeHtml(doctorCrm)}</p>` : ''}
        ${doctorSpecialty ? `<p class="doc-doctor-specialty">${escapeHtml(doctorSpecialty)}</p>` : ''}
        ${clinicAddress ? `<p class="doc-doctor-addr">${escapeHtml(clinicAddress)}</p>` : ''}
        ${clinicPhone ? `<p class="doc-doctor-phone">${escapeHtml(clinicPhone)}</p>` : ''}
      </div>
    </header>
    <hr class="doc-divider" />`
}

export function buildFooterHtml(opts: {
  doctorName: string
  doctorCrm: string
  issuedAt: Date
  clinicCity?: string
  qrDataUrl?: string
  verificationUrl?: string
  useStamp?: boolean
}): string {
  const { doctorName, doctorCrm, issuedAt, clinicCity, qrDataUrl, verificationUrl, useStamp } = opts
  const signedBy = useStamp
    ? `${escapeHtml(doctorName)} • ${escapeHtml(doctorCrm)} • Emitido em: ${formatDateBr(issuedAt)}`
    : `Assinado digitalmente por: ${escapeHtml(doctorName)} - ${escapeHtml(doctorCrm)}`
  return `
    <footer class="doc-footer">
      <div class="doc-footer-left">
        ${qrDataUrl ? `
          <img src="${escapeHtml(qrDataUrl)}" alt="QR Code" class="doc-qr" />
          <div class="doc-verify-text">
            <p>Verifique a autenticidade deste documento</p>
            ${verificationUrl ? `<p class="doc-verify-url">${escapeHtml(verificationUrl)}</p>` : ''}
          </div>` : ''}
      </div>
      <div class="doc-footer-right">
        <p class="doc-footer-date"><span class="doc-label">Data:</span> ${formatDateTimeBr(issuedAt)}</p>
        <p class="doc-footer-signed">${signedBy}</p>
        ${clinicCity ? `<p class="doc-footer-location">${escapeHtml(clinicCity)}</p>` : ''}
      </div>
    </footer>`
}

export function wrapDocument(pages: string[], title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>${CSS_MEDICAL_DOC}</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`
}
