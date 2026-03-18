/**
 * Serviço de exportação de prontuários médicos para PDF
 * Gera PDFs completos com histórico, anexos e assinaturas.
 *
 * Header/footer compartilham o mesmo layout visual das prescrições,
 * encaminhamentos e solicitações de exame.
 */

import prisma from '@/lib/prisma'
import { getClinicDataForDocuments } from '@/lib/branding-service'
import { decrypt } from '@/lib/crypto'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'
import {
  escapeHtml,
  formatCpf,
  formatDoctorLine,
  formatDateBr,
  generateQRDataUrl,
  resolveLogoToDataUrl,
  buildHeaderHtml,
  buildFooterHtml,
} from '@/lib/documents/medical-doc-html'

// ============ TYPES ============

export interface MedicalRecordExportOptions {
  recordId: string
  includeVersionHistory?: boolean
  includeAttachments?: boolean
  includeSignatures?: boolean
  includeAuditLog?: boolean
  format?: 'html' | 'pdf'
  language?: 'pt-BR' | 'en-US'
}

export interface MedicalRecordExportData {
  record: {
    id: string
    title: string
    description: string
    content: string | null
    recordType: string
    priority: string
    severity: string | null
    version: number
    status: string
    createdAt: Date
    updatedAt: Date
  }
  patient: {
    id: string
    name: string
    cpf: string | null
    birthDate: Date | null
    gender: string | null
    phone: string | null
    email: string | null
  } | null
  doctor: {
    id: string
    name: string
    crm: string | null
    crmFormatted: string
    specialty: string | null
  } | null
  clinic: {
    name: string
    address: string | null
    phone: string | null
    logoUrl: string | null
  } | null
  versionHistory: Array<{
    version: number
    changedBy: string
    changedAt: Date
    changes: string
  }>
  attachments: Array<{
    id: string
    fileName: string
    fileType: string
    fileSize: number
    createdAt: Date
  }>
  signatures: Array<{
    id: string
    signerName: string
    signedAt: Date
    signatureType: string
    isValid: boolean
  }>
}

// ============ DATA FETCHING ============

export async function fetchMedicalRecordForExport(
  recordId: string,
  options: MedicalRecordExportOptions
): Promise<MedicalRecordExportData> {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: {
      patient: { select: { id: true, name: true, cpf: true, birthDate: true, gender: true, phone: true, email: true } },
      doctor: {
        select: {
          id: true, name: true,
          crmNumber: true, licenseNumber: true, licenseType: true, licenseState: true,
          speciality: true,
        },
      },
      ...(options.includeAttachments && { attachments: true }),
    },
  })

  if (!record) {
    throw new Error(`Prontuário ${recordId} não encontrado`)
  }

  // Buscar informações da clínica (Branding + SystemSettings)
  let clinic: MedicalRecordExportData['clinic'] = null
  try {
    const clinicData = await getClinicDataForDocuments()
    if (clinicData.clinicName || clinicData.logoUrl || clinicData.clinicAddress) {
      const addrParts = [clinicData.clinicAddress, clinicData.clinicCity, clinicData.clinicState].filter(Boolean)
      const address = addrParts.length
        ? addrParts.join(', ') + (clinicData.clinicZipCode ? ` - CEP ${clinicData.clinicZipCode}` : '')
        : null
      clinic = {
        name: clinicData.clinicName || 'Clínica',
        address,
        phone: clinicData.clinicPhone || null,
        logoUrl: clinicData.logoUrl || null,
      }
    }
  } catch {
    // Ignorar se não houver configuração de clínica
  }

  // Buscar assinaturas (se solicitado) - função pode não existir
  const signatures: MedicalRecordExportData['signatures'] = []
  // TODO: Add MedicalRecordSignature model to schema

  return {
    record: {
      id: record.id,
      title: record.title,
      description: record.description || '',
      content: record.notes || record.description || '',
      recordType: record.recordType,
      priority: record.priority || 'NORMAL',
      severity: record.severity,
      version: record.version,
      status: 'ACTIVE',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    },
    patient: record.patient ? {
      id: record.patient.id,
      name: record.patient.name,
      cpf: (() => {
        try { return record.patient.cpf ? decrypt(record.patient.cpf) : null } catch { return record.patient.cpf }
      })(),
      birthDate: record.patient.birthDate,
      gender: record.patient.gender,
      phone: record.patient.phone,
      email: record.patient.email,
    } : null,
    doctor: record.doctor ? (() => {
      const { crm: crmFormatted, specialty } = formatDoctorLine(record.doctor)
      return {
        id: record.doctor.id,
        name: record.doctor.name,
        crm: record.doctor.crmNumber || record.doctor.licenseNumber || null,
        crmFormatted,
        specialty: specialty || null,
      }
    })() : null,
    clinic,
    versionHistory: [],
    attachments: (record.attachments || []).map((att) => ({
      id: att.id,
      fileName: att.fileName || 'arquivo',
      fileType: att.mimeType || 'application/octet-stream',
      fileSize: att.fileSize || 0,
      createdAt: att.createdAt
    })),
    signatures
  }
}

// ============ HTML GENERATION ============

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  PRESCRIPTION: 'Prescrição',
  LAB_RESULT: 'Resultado Laboratorial',
  IMAGING: 'Exame de Imagem',
  VACCINATION: 'Vacinação',
  SURGERY: 'Cirurgia',
  NOTE: 'Anotação',
  OTHER: 'Outro',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981', NORMAL: '#3b82f6', HIGH: '#f97316', CRITICAL: '#dc2626',
}

function calcAge(birthDate: Date | null): string {
  if (!birthDate) return ''
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() - birth.getMonth() < 0 ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return ` (${age} anos)`
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDateHour(date: Date | null): string {
  if (!date) return '-'
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

const CSS_PRONTUARIO = `
  @page { margin: 40pt 50pt; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
  .page { padding: 0; min-height: calc(100vh - 80pt); position: relative; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }

  /* Shared header/footer (from medical-doc-html) */
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
  .doc-title { text-align: center; font-size: 14pt; font-weight: bold; letter-spacing: 0.5pt; margin: 0 0 14pt 0; color: #111; }
  .doc-label { font-weight: bold; color: #374151; }
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

  /* Prontuário body styles */
  .pr-body { flex: 1; }
  .pr-patient { margin-bottom: 14pt; }
  .pr-patient p { margin: 2pt 0; font-size: 10.5pt; }
  .pr-meta { display: flex; gap: 16pt; margin-bottom: 14pt; font-size: 9.5pt; color: #374151; background: #F9FAFB; padding: 8pt 10pt; border-left: 3pt solid #1a7a8a; }
  .pr-meta span { margin-right: 16pt; }
  .pr-section-title { font-size: 10pt; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.5pt; margin: 14pt 0 6pt 0; border-bottom: 0.75pt solid #E5E7EB; padding-bottom: 4pt; }
  .pr-content { padding: 10pt 12pt; background: #f8f9fa; border-left: 3pt solid #6B7280; font-size: 10pt; line-height: 1.6; white-space: pre-wrap; margin-bottom: 10pt; }
  .pr-priority { display: inline-block; font-size: 8.5pt; font-weight: 700; padding: 2pt 8pt; border-radius: 3pt; }
  .pr-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 10pt; }
  .pr-table th { background: #F3F4F6; font-weight: 600; color: #374151; padding: 6pt 8pt; text-align: left; border-bottom: 0.75pt solid #D1D5DB; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.3pt; }
  .pr-table td { padding: 6pt 8pt; border-bottom: 0.5pt solid #E5E7EB; }
`

export async function generateMedicalRecordHtml(
  options: MedicalRecordExportOptions
): Promise<string> {
  const data = await fetchMedicalRecordForExport(options.recordId, options)

  // QR de verificação
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
  const signedDoc = await prisma.signedDocument.findFirst({
    where: { documentType: 'MEDICAL_RECORD', documentId: options.recordId },
    orderBy: { signedAt: 'desc' },
  }).catch(() => null)
  const verificationUrl = signedDoc?.signatureHash
    ? `${baseUrl}/verify/${signedDoc.signatureHash}`
    : undefined
  const qrDataUrl = verificationUrl ? await generateQRDataUrl(verificationUrl).catch(() => undefined) : undefined

  // Logo
  const logoDataUrl = resolveLogoToDataUrl(data.clinic?.logoUrl)

  // Header
  const doctorName = data.doctor?.name || '—'
  const doctorCrm = data.doctor?.crmFormatted || ''
  const doctorSpecialty = data.doctor?.specialty || undefined
  const clinicAddress = data.clinic?.address || undefined
  const clinicPhone = data.clinic?.phone || undefined
  const clinicName = data.clinic?.name || undefined

  const headerHtml = buildHeaderHtml({
    doctorName,
    doctorCrm,
    doctorSpecialty,
    clinicAddress,
    clinicPhone,
    clinicName,
    logoDataUrl,
  })

  // Patient section
  const patientSection = data.patient ? `
    <section class="pr-patient">
      <p><span class="doc-label">Paciente:</span> ${escapeHtml(data.patient.name)}</p>
      ${data.patient.cpf ? `<p><span class="doc-label">CPF:</span> ${formatCpf(data.patient.cpf)}</p>` : ''}
      ${data.patient.birthDate ? `<p><span class="doc-label">Data de nascimento:</span> ${formatDateBr(data.patient.birthDate)}${calcAge(data.patient.birthDate)}</p>` : ''}
      ${data.patient.gender ? `<p><span class="doc-label">Sexo:</span> ${data.patient.gender === 'MALE' ? 'Masculino' : data.patient.gender === 'FEMALE' ? 'Feminino' : 'Outro'}</p>` : ''}
    </section>` : ''

  // Record meta
  const priorityColor = PRIORITY_COLORS[data.record.priority] || '#6b7280'
  const priorityLabel = PRIORITY_LABELS[data.record.priority] || data.record.priority
  const typeLabel = TYPE_LABELS[data.record.recordType] || data.record.recordType

  const metaSection = `
    <div class="pr-meta">
      <span><span class="doc-label">Tipo:</span> ${escapeHtml(typeLabel)}</span>
      <span><span class="doc-label">Prioridade:</span> <span class="pr-priority" style="background:${priorityColor}20;color:${priorityColor}">${escapeHtml(priorityLabel)}</span></span>
      <span><span class="doc-label">Versão:</span> v${data.record.version}</span>
      <span><span class="doc-label">Data:</span> ${fmtDateHour(data.record.createdAt)}</span>
    </div>`

  // Clinical content
  const descriptionBlock = data.record.description
    ? `<p class="pr-section-title">Descrição Clínica</p>
       <div class="pr-content">${escapeHtml(data.record.description)}</div>`
    : ''

  const contentBlock = data.record.content && data.record.content !== data.record.description
    ? `<p class="pr-section-title">Conteúdo Detalhado</p>
       <div class="pr-content">${escapeHtml(data.record.content)}</div>`
    : ''

  // Attachments
  const attachmentsBlock = options.includeAttachments && data.attachments.length > 0 ? `
    <p class="pr-section-title">Anexos (${data.attachments.length})</p>
    <table class="pr-table">
      <thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Data</th></tr></thead>
      <tbody>${data.attachments.map(a => `
        <tr>
          <td>${escapeHtml(a.fileName)}</td>
          <td>${escapeHtml(a.fileType)}</td>
          <td>${fmtBytes(a.fileSize)}</td>
          <td>${fmtDateHour(a.createdAt)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''

  const bodyHtml = `
    <div class="pr-body">
      ${metaSection}
      ${descriptionBlock}
      ${contentBlock}
      ${attachmentsBlock}
    </div>`

  // Footer
  const footerHtml = buildFooterHtml({
    doctorName,
    doctorCrm,
    issuedAt: data.record.createdAt,
    clinicCity: undefined,
    qrDataUrl,
    verificationUrl,
    useStamp: !signedDoc,
  })

  const page = `
    <div class="page">
      ${headerHtml}
      <p class="doc-title">PRONTUÁRIO MÉDICO</p>
      ${patientSection}
      ${bodyHtml}
      ${footerHtml}
    </div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(`Prontuário — ${data.patient?.name || data.record.title}`)}</title>
  <style>${CSS_PRONTUARIO}</style>
</head>
<body>
  ${page}
</body>
</html>`
}

// ============ EXPORT FUNCTIONS ============

export async function exportMedicalRecordToPdf(
  options: MedicalRecordExportOptions
): Promise<Buffer> {
  const html = await generateMedicalRecordHtml(options)
  try {
    const { convertHtmlToPdfWithFallback } = await import('@/lib/pdf-converter')
    return await convertHtmlToPdfWithFallback(html, {
      marginPt: 28, // ~10mm
      timeoutMs: 120000,
    })
  } catch (error) {
    logger.error({ err: error, recordId: options.recordId }, 'Falha ao gerar PDF do prontuário (todos os backends)')
    throw error instanceof Error ? error : new Error('Serviço de PDF indisponível')
  }
}

// ============ BATCH EXPORT ============

export async function exportMultipleMedicalRecords(
  recordIds: string[],
  options: Omit<MedicalRecordExportOptions, 'recordId'>
): Promise<Array<{ id: string; html: string; error?: string }>> {
  const results = await Promise.allSettled(
    recordIds.map(async (recordId) => {
      const html = await generateMedicalRecordHtml({ ...options, recordId })
      return { id: recordId, html }
    })
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        id: recordIds[index],
        html: '',
        error: result.reason?.message || 'Erro ao exportar'
      }
    }
  })
}
