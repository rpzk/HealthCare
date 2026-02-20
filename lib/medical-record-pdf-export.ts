/**
 * Serviço de exportação de prontuários médicos para PDF
 * Gera PDFs completos com histórico, anexos e assinaturas
 */

import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'

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
      patient: true,
      doctor: true,
      ...(options.includeAttachments && {
        attachments: true
      })
    }
  })

  if (!record) {
    throw new Error(`Prontuário ${recordId} não encontrado`)
  }

  // Buscar informações da clínica (se disponível)
  let clinic = null
  try {
    const settings = await prisma.systemSetting.findFirst({
      where: { key: 'clinic_info' }
    })
    if (settings?.value) {
      clinic = JSON.parse(settings.value as string)
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
      cpf: record.patient.cpf,
      birthDate: record.patient.birthDate,
      gender: record.patient.gender,
      phone: record.patient.phone,
      email: record.patient.email
    } : null,
    doctor: record.doctor ? {
      id: record.doctor.id,
      name: record.doctor.name,
      crm: record.doctor.crmNumber || record.doctor.licenseNumber || null,
      specialty: record.doctor.speciality || null
    } : null,
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

export async function generateMedicalRecordHtml(
  options: MedicalRecordExportOptions
): Promise<string> {
  const data = await fetchMedicalRecordForExport(options.recordId, options)
  
  const formatDateBR = (date: Date | null) => {
    if (!date) return '-'
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      CONSULTATION: 'Consulta',
      EXAM: 'Exame',
      PROCEDURE: 'Procedimento',
      PRESCRIPTION: 'Prescrição',
      LAB_RESULT: 'Resultado Laboratorial',
      IMAGING: 'Exame de Imagem',
      VACCINATION: 'Vacinação',
      SURGERY: 'Cirurgia',
      NOTE: 'Anotação',
      OTHER: 'Outro'
    }
    return labels[type] || type
  }

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      LOW: 'Baixa',
      NORMAL: 'Normal',
      HIGH: 'Alta',
      CRITICAL: 'Crítica'
    }
    return labels[priority] || priority
  }

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      LOW: '#10b981',
      NORMAL: '#3b82f6',
      HIGH: '#f97316',
      CRITICAL: '#dc2626'
    }
    return colors[priority] || '#6b7280'
  }

  const calculateAge = (birthDate: Date | null): string => {
    if (!birthDate) return '-'
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return `${age} anos`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prontuário Médico - ${data.record.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      color: #1f2937; 
      line-height: 1.6;
      font-size: 11pt;
      background: white;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Header */
    .header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    
    .header .logo {
      max-height: 60px;
      margin-bottom: 10px;
    }
    
    .header h1 {
      color: #0066cc;
      font-size: 22pt;
      margin-bottom: 5px;
    }
    
    .header .subtitle {
      color: #6b7280;
      font-size: 10pt;
    }
    
    .header .clinic-info {
      margin-top: 10px;
      font-size: 9pt;
      color: #6b7280;
    }
    
    /* Document Info */
    .doc-info {
      display: flex;
      justify-content: space-between;
      background: #f3f4f6;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    .doc-info .item {
      display: flex;
      gap: 8px;
    }
    
    .doc-info .label {
      color: #6b7280;
    }
    
    .doc-info .value {
      font-weight: 600;
    }
    
    /* Sections */
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      color: #0066cc;
      font-size: 14pt;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 8px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section h2::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #0066cc;
      border-radius: 2px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .info-item {
      background: #f9fafb;
      padding: 10px 14px;
      border-radius: 6px;
      border-left: 3px solid #0066cc;
    }
    
    .info-item.full {
      grid-column: span 2;
    }
    
    .info-item .label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-item .value {
      font-weight: 500;
      color: #1f2937;
    }
    
    /* Priority Badge */
    .priority-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    /* Content */
    .content-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      white-space: pre-wrap;
      font-family: inherit;
      line-height: 1.7;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    /* Signatures */
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 40px;
    }
    
    .signature-box {
      text-align: center;
      padding: 20px;
      border-top: 2px solid #1f2937;
    }
    
    .signature-box .name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .signature-box .info {
      font-size: 9pt;
      color: #6b7280;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    
    .footer .hash {
      font-family: monospace;
      font-size: 7pt;
      margin-top: 5px;
      word-break: break-all;
    }
    
    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .no-print {
        display: none;
      }
      
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      ${data.clinic?.logoUrl ? `<img src="${data.clinic.logoUrl}" alt="Logo" class="logo">` : ''}
      <h1>${data.clinic?.name || 'Healthcare'}</h1>
      <p class="subtitle">Prontuário Eletrônico do Paciente</p>
      ${data.clinic?.address || data.clinic?.phone ? `
        <p class="clinic-info">
          ${[data.clinic.address, data.clinic.phone].filter(Boolean).join(' • ')}
        </p>
      ` : ''}
    </header>

    <!-- Document Info -->
    <div class="doc-info">
      <div class="item">
        <span class="label">Documento:</span>
        <span class="value">#${data.record.id.slice(-8).toUpperCase()}</span>
      </div>
      <div class="item">
        <span class="label">Versão:</span>
        <span class="value">v${data.record.version}</span>
      </div>
      <div class="item">
        <span class="label">Gerado em:</span>
        <span class="value">${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
      </div>
    </div>

    <!-- Dados do Prontuário -->
    <section class="section">
      <h2>Informações do Prontuário</h2>
      <div class="info-grid">
        <div class="info-item full">
          <div class="label">Título</div>
          <div class="value">${data.record.title}</div>
        </div>
        <div class="info-item">
          <div class="label">Tipo</div>
          <div class="value">${getTypeLabel(data.record.recordType)}</div>
        </div>
        <div class="info-item">
          <div class="label">Prioridade</div>
          <div class="value">
            <span class="priority-badge" style="background: ${getPriorityColor(data.record.priority)}20; color: ${getPriorityColor(data.record.priority)}">
              ${getPriorityLabel(data.record.priority)}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="label">Data de Criação</div>
          <div class="value">${formatDateBR(data.record.createdAt)}</div>
        </div>
        <div class="info-item">
          <div class="label">Última Atualização</div>
          <div class="value">${formatDateBR(data.record.updatedAt)}</div>
        </div>
        ${data.record.severity ? `
          <div class="info-item">
            <div class="label">Gravidade</div>
            <div class="value">${data.record.severity}</div>
          </div>
        ` : ''}
      </div>
    </section>

    <!-- Dados do Paciente -->
    ${data.patient ? `
    <section class="section">
      <h2>Dados do Paciente</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Nome Completo</div>
          <div class="value">${data.patient.name}</div>
        </div>
        ${data.patient.cpf ? `
          <div class="info-item">
            <div class="label">CPF</div>
            <div class="value">${data.patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>
          </div>
        ` : ''}
        ${data.patient.birthDate ? `
          <div class="info-item">
            <div class="label">Data de Nascimento</div>
            <div class="value">${format(new Date(data.patient.birthDate), 'dd/MM/yyyy', { locale: ptBR })} (${calculateAge(data.patient.birthDate)})</div>
          </div>
        ` : ''}
        ${data.patient.gender ? `
          <div class="info-item">
            <div class="label">Sexo</div>
            <div class="value">${data.patient.gender === 'MALE' ? 'Masculino' : data.patient.gender === 'FEMALE' ? 'Feminino' : 'Outro'}</div>
          </div>
        ` : ''}
        ${data.patient.phone ? `
          <div class="info-item">
            <div class="label">Telefone</div>
            <div class="value">${data.patient.phone}</div>
          </div>
        ` : ''}
        ${data.patient.email ? `
          <div class="info-item">
            <div class="label">E-mail</div>
            <div class="value">${data.patient.email}</div>
          </div>
        ` : ''}
      </div>
    </section>
    ` : ''}

    <!-- Profissional Responsável -->
    ${data.doctor ? `
    <section class="section">
      <h2>Profissional Responsável</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Nome</div>
          <div class="value">${data.doctor.name}</div>
        </div>
        ${data.doctor.crm ? `
          <div class="info-item">
            <div class="label">CRM</div>
            <div class="value">${data.doctor.crm}</div>
          </div>
        ` : ''}
        ${data.doctor.specialty ? `
          <div class="info-item">
            <div class="label">Especialidade</div>
            <div class="value">${data.doctor.specialty}</div>
          </div>
        ` : ''}
      </div>
    </section>
    ` : ''}

    <!-- Descrição/Conteúdo -->
    <section class="section">
      <h2>Descrição Clínica</h2>
      ${data.record.description ? `
        <div class="content-box">
          ${data.record.description}
        </div>
      ` : '<p style="color: #9ca3af; font-style: italic;">Sem descrição registrada.</p>'}
    </section>

    ${data.record.content ? `
    <section class="section">
      <h2>Conteúdo Detalhado</h2>
      <div class="content-box">
        ${data.record.content}
      </div>
    </section>
    ` : ''}

    <!-- Histórico de Versões -->
    ${options.includeVersionHistory && data.versionHistory.length > 0 ? `
    <section class="section page-break">
      <h2>Histórico de Versões</h2>
      <table>
        <thead>
          <tr>
            <th>Versão</th>
            <th>Data</th>
            <th>Alterado por</th>
            <th>Alterações</th>
          </tr>
        </thead>
        <tbody>
          ${data.versionHistory.map(v => `
            <tr>
              <td>v${v.version}</td>
              <td>${formatDateBR(v.changedAt)}</td>
              <td>${v.changedBy}</td>
              <td>${v.changes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    ` : ''}

    <!-- Anexos -->
    ${options.includeAttachments && data.attachments.length > 0 ? `
    <section class="section">
      <h2>Anexos (${data.attachments.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Tipo</th>
            <th>Tamanho</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${data.attachments.map(a => `
            <tr>
              <td>${a.fileName}</td>
              <td>${a.fileType}</td>
              <td>${formatFileSize(a.fileSize)}</td>
              <td>${formatDateBR(a.createdAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    ` : ''}

    <!-- Assinaturas -->
    ${options.includeSignatures && data.signatures.length > 0 ? `
    <section class="section">
      <h2>Assinaturas Digitais</h2>
      <table>
        <thead>
          <tr>
            <th>Assinante</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.signatures.map(s => `
            <tr>
              <td>${s.signerName}</td>
              <td>${formatDateBR(s.signedAt)}</td>
              <td>${s.signatureType === 'digital' ? 'Digital' : s.signatureType}</td>
              <td style="color: ${s.isValid ? '#10b981' : '#dc2626'}">
                ${s.isValid ? '✓ Válida' : '✗ Inválida'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    ` : `
    <div class="signatures-grid">
      ${data.doctor ? `
        <div class="signature-box">
          <div class="name">${data.doctor.name}</div>
          <div class="info">${data.doctor.crm ? `CRM: ${data.doctor.crm}` : 'Médico Responsável'}</div>
        </div>
      ` : ''}
      ${data.patient ? `
        <div class="signature-box">
          <div class="name">${data.patient.name}</div>
          <div class="info">Paciente</div>
        </div>
      ` : ''}
    </div>
    `}

    <!-- Footer -->
    <footer class="footer">
      <p>Documento gerado eletronicamente pelo Sistema Healthcare em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
      <p>Este documento possui validade legal conforme Lei nº 14.063/2020 e Resolução CFM nº 2.299/2021</p>
      <p class="hash">ID do Documento: ${data.record.id}</p>
    </footer>
  </div>
</body>
</html>
`

  return html
}

// ============ EXPORT FUNCTIONS ============

export async function exportMedicalRecordToPdf(
  options: MedicalRecordExportOptions
): Promise<Buffer> {
  const html = await generateMedicalRecordHtml(options)
  
  // Usar Gotenberg se disponível, senão retornar HTML
  const gotenbergUrl = process.env.GOTENBERG_URL || 'http://gotenberg:3000'
  
  try {
    const formData = new FormData()
    formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
    formData.append('marginTop', '10mm')
    formData.append('marginBottom', '10mm')
    formData.append('marginLeft', '10mm')
    formData.append('marginRight', '10mm')
    formData.append('printBackground', 'true')

    const response = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Gotenberg error: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    logger.warn('Gotenberg não disponível, retornando HTML:', error)
    // Fallback: retornar HTML como buffer
    return Buffer.from(html, 'utf-8')
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
