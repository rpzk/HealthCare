/**
 * Generates a comprehensive PDF of a patient's medical record.
 * Includes: demographics, consultations, prescriptions, medical records, exams, attachments.
 */

import prisma from '@/lib/prisma'
import { formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gender } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface PatientPdfExportOptions {
  patientId: string
  includeDemographics?: boolean
  includeConsultations?: boolean
  includePrescriptions?: boolean
  includeMedicalRecords?: boolean
  includeExams?: boolean
  includeAttachments?: boolean
}

export async function generatePatientPdfHtml(options: PatientPdfExportOptions): Promise<string> {
  const {
    patientId,
    includeDemographics = true,
    includeConsultations = true,
    includePrescriptions = true,
    includeMedicalRecords = true,
    includeExams = true,
    includeAttachments = true,
  } = options

  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient) throw new Error(`Patient ${patientId} not found`)

  const [consultations, prescriptions, medicalRecords, examRequests, attachments] =
    await Promise.all([
      includeConsultations
        ? prisma.consultation.findMany({
            where: { patientId },
            include: { doctor: true, diagnoses: true },
            orderBy: { scheduledDate: 'desc' },
            take: 20,
          })
        : [],
      includePrescriptions
        ? prisma.prescription.findMany({
            where: { patientId },
            include: { doctor: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : [],
      includeMedicalRecords
        ? prisma.medicalRecord.findMany({
            where: { patientId },
            include: { doctor: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : [],
      includeExams
        ? prisma.examRequest.findMany({
            where: { patientId },
            include: { doctor: true },
            orderBy: { requestDate: 'desc' },
            take: 20,
          })
        : [],
      includeAttachments
        ? prisma.attachment.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : [],
    ])

  // Build HTML
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prontuário Eletrônico - ${patient.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
    .page { page-break-after: always; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0066cc; font-size: 28px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #0066cc; font-size: 18px; border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 15px; }
    .section h3 { color: #333; font-size: 14px; font-weight: 600; margin-top: 15px; margin-bottom: 8px; }
    .demographics { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .demo-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .demo-label { font-weight: 600; color: #0066cc; width: 30%; }
    .demo-value { flex: 1; }
    .entry { border-left: 3px solid #0066cc; padding: 12px; margin-bottom: 15px; background: #fafafa; }
    .entry-date { color: #0066cc; font-weight: 600; font-size: 13px; }
    .entry-title { font-size: 15px; font-weight: 600; color: #333; margin: 5px 0; }
    .entry-content { font-size: 13px; color: #555; line-height: 1.5; }
    .entry-doctor { color: #666; font-size: 12px; margin-top: 8px; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
    th { background: #0066cc; color: white; padding: 10px; text-align: left; font-weight: 600; }
    td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
    .stamp { background: #fff3cd; border: 2px solid #ffc107; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; }
    .stamp strong { color: #cc7a00; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>Prontuário Eletrônico</h1>
      <p>Sistema de Saúde Digital - Documento Confidencial</p>
      <p style="margin-top: 10px; color: #999; font-size: 12px;">Gerado em ${formatDate(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
    </div>

    ${
      includeDemographics
        ? `
    <div class="section">
      <h2>Dados Demográficos</h2>
      <div class="demographics">
        <div class="demo-row">
          <span class="demo-label">Nome:</span>
          <span class="demo-value">${patient.name}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">CPF:</span>
          <span class="demo-value">${patient.cpf || 'Não informado'}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Email:</span>
          <span class="demo-value">${patient.email}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Data de Nascimento:</span>
          <span class="demo-value">${formatDate(patient.birthDate, 'dd/MM/yyyy')}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Gênero:</span>
          <span class="demo-value">${
            patient.gender === Gender.MALE
              ? 'Masculino'
              : patient.gender === Gender.FEMALE
              ? 'Feminino'
              : 'Outro'
          }</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Telefone:</span>
          <span class="demo-value">${patient.phone || 'Não informado'}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Nível de Risco:</span>
          <span class="demo-value">${patient.riskLevel || 'BAIXO'}</span>
        </div>
        <div class="demo-row">
          <span class="demo-label">Alergias:</span>
          <span class="demo-value">${patient.allergies || 'Nenhuma informada'}</span>
        </div>
      </div>
    </div>
    `
        : ''
    }

    ${
      includeConsultations && consultations.length > 0
        ? `
    <div class="section">
      <h2>Histórico de Consultas</h2>
      ${consultations
        .map(
          (c) => `
        <div class="entry">
          <div class="entry-date">${formatDate(c.scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
          <div class="entry-title">${c.type} - ${c.status}</div>
          ${c.chiefComplaint ? `<div class="entry-content"><strong>Queixa Principal:</strong> ${c.chiefComplaint}</div>` : ''}
          ${c.assessment ? `<div class="entry-content"><strong>Avaliação:</strong> ${c.assessment.substring(0, 300)}...</div>` : ''}
          ${c.plan ? `<div class="entry-content"><strong>Plano:</strong> ${c.plan.substring(0, 300)}...</div>` : ''}
          <div class="entry-doctor">Médico: ${c.doctor?.name || 'N/A'}</div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      includePrescriptions && prescriptions.length > 0
        ? `
    <div class="section">
      <h2>Prescrições</h2>
      <table>
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosagem</th>
            <th>Frequência</th>
            <th>Duração</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptions
            .map(
              (p) => `
            <tr>
              <td>${p.medication}</td>
              <td>${p.dosage}</td>
              <td>${p.frequency}</td>
              <td>${p.duration}</td>
              <td>${formatDate(p.createdAt, 'dd/MM/yyyy')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    ${
      includeMedicalRecords && medicalRecords.length > 0
        ? `
    <div class="section">
      <h2>Registros Médicos</h2>
      ${medicalRecords
        .map(
          (m) => `
        <div class="entry">
          <div class="entry-date">${formatDate(m.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
          <div class="entry-title">${m.title} (${m.recordType})</div>
          ${m.description ? `<div class="entry-content"><strong>Descrição:</strong> ${m.description}</div>` : ''}
          ${m.diagnosis ? `<div class="entry-content"><strong>Diagnóstico:</strong> ${m.diagnosis}</div>` : ''}
          ${m.treatment ? `<div class="entry-content"><strong>Tratamento:</strong> ${m.treatment}</div>` : ''}
          <div class="entry-doctor">Médico: ${m.doctor?.name || 'N/A'} | Gravidade: ${m.severity}</div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      includeExams && examRequests.length > 0
        ? `
    <div class="section">
      <h2>Solicitações de Exames</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de Exame</th>
            <th>Urgência</th>
            <th>Status</th>
            <th>Data Solicitação</th>
          </tr>
        </thead>
        <tbody>
          ${examRequests
            .map(
              (e) => `
            <tr>
              <td>${e.examType}</td>
              <td>${e.urgency}</td>
              <td>${e.status}</td>
              <td>${formatDate(e.requestDate, 'dd/MM/yyyy')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    ${
      includeAttachments && attachments.length > 0
        ? `
    <div class="section">
      <h2>Anexos</h2>
      <table>
        <thead>
          <tr>
            <th>Nome do Arquivo</th>
            <th>Tipo</th>
            <th>Tamanho</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${attachments
            .map(
              (a) => `
            <tr>
              <td>${a.originalName}</td>
              <td>${a.mimeType}</td>
              <td>${Math.round(a.fileSize / 1024)} KB</td>
              <td>${formatDate(a.createdAt, 'dd/MM/yyyy')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Este documento é confidencial e destina-se apenas ao uso autorizado.</p>
      <p>Gerado automaticamente pelo Sistema de Prontuário Eletrônico</p>
    </div>
  </div>
</body>
</html>
  `

  return html
}

export async function generatePatientPdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic import of puppeteer for server-side rendering
  // Note: Puppeteer needs to be installed and Chrome/Chromium must be available
  const puppeteer = require('puppeteer')

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()

    // Set page size and margins
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    })

    await browser.close()
    return pdf
  } catch (e) {
    logger.error('[PDF Generation] Puppeteer error:', e)
    throw new Error('Erro ao gerar PDF. Certifique-se de que Puppeteer e Chromium estão instalados.')
  }
}
