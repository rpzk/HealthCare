/**
 * Gerador de PDF para Documentos Médicos
 * 
 * Gera PDFs profissionais em conformidade com CFM 2.299/2021
 * Usa PDFKit para geração nativa de PDF (sem conversão HTML)
 */

import PDFDocument from 'pdfkit'
import fs from 'fs'
import QRCode from 'qrcode'
import { 
  PrescriptionDocument, 
  MedicalCertificateDocument,
  ReferralDocument,
  ExamRequestDocument,
  MedicalReportDocument,
  MedicationItem,
  DoctorInfo,
  PatientInfo,
} from './types'
import { classifyMedication, numberToWords } from './validator'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any // PDFKit types are incomplete

// ============================================
// CONFIGURAÇÕES DE ESTILO
// ============================================

const STYLES = {
  // Fontes
  fonts: {
    title: 'Helvetica-Bold',
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    italic: 'Helvetica-Oblique',
  },
  // Tamanhos
  sizes: {
    title: 16,
    heading: 12,
    subheading: 11,
    body: 10,
    small: 9,
    tiny: 8,
  },
  // Cores
  colors: {
    black: '#000000',
    darkGray: '#333333',
    gray: '#666666',
    lightGray: '#999999',
    red: '#DC2626',
    orange: '#EA580C',
    blue: '#2563EB',
  },
  // Margens
  margins: {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
  },
}

// ============================================
// FONTES (evita erro de Helvetica.afm em produção)
// ============================================

const FONT_FILES = {
  regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  italic: '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf',
}

function registerPdfFonts(doc: PDFDoc) {
  try {
    if (fs.existsSync(FONT_FILES.regular)) {
      doc.registerFont('LiberationSans-Regular', FONT_FILES.regular)
      doc.registerFont('LiberationSans-Bold', FONT_FILES.bold)
      doc.registerFont('LiberationSans-Italic', FONT_FILES.italic)

      STYLES.fonts.title = 'LiberationSans-Bold'
      STYLES.fonts.heading = 'LiberationSans-Bold'
      STYLES.fonts.body = 'LiberationSans-Regular'
      STYLES.fonts.italic = 'LiberationSans-Italic'
    }
  } catch (err) {
    logger.warn('Falha ao registrar fontes do PDF, usando Helvetica padrão', err)
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

async function generateQRCode(data: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    width: 100,
  } as any)
}

// ============================================
// CABEÇALHO DO MÉDICO (CFM 2.299/2021 Art. 2º)
// ============================================

function drawDoctorHeader(doc: PDFDoc, doctor: DoctorInfo, y: number): number {
  const centerX = doc.page.width / 2
  
  // Nome do médico
  doc.font(STYLES.fonts.heading)
     .fontSize(STYLES.sizes.title)
     .fillColor(STYLES.colors.black)
     .text(doctor.name.toUpperCase(), STYLES.margins.left, y, {
       align: 'center',
       width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
     })
  
  y += 20
  
  // CRM e especialidade
  let crmLine = `CRM-${doctor.crmState} ${doctor.crm}`
  if (doctor.rqe) {
    crmLine += ` • RQE ${doctor.rqe}`
  }
  
  doc.font(STYLES.fonts.body)
     .fontSize(STYLES.sizes.body)
     .fillColor(STYLES.colors.darkGray)
     .text(crmLine, STYLES.margins.left, y, {
       align: 'center',
       width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
     })
  
  y += 14
  
  if (doctor.specialty) {
    doc.font(STYLES.fonts.italic)
       .fontSize(STYLES.sizes.small)
       .fillColor(STYLES.colors.gray)
       .text(doctor.specialty, STYLES.margins.left, y, {
         align: 'center',
         width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
       })
    y += 12
  }
  
  // Endereço
  doc.font(STYLES.fonts.body)
     .fontSize(STYLES.sizes.small)
     .fillColor(STYLES.colors.gray)
     .text(doctor.address, STYLES.margins.left, y, {
       align: 'center',
       width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
     })
  
  y += 12
  
  // Cidade e contatos
  let contactLine = doctor.city || ''
  if (doctor.phone) {
    contactLine += ` • Tel: ${doctor.phone}`
  }
  if (doctor.email) {
    contactLine += ` • ${doctor.email}`
  }
  
  if (contactLine) {
    doc.text(contactLine, STYLES.margins.left, y, {
      align: 'center',
      width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
    })
    y += 12
  }
  
  // Clínica
  if (doctor.clinicName) {
    doc.font(STYLES.fonts.italic)
       .fontSize(STYLES.sizes.tiny)
       .text(doctor.clinicName, STYLES.margins.left, y, {
         align: 'center',
         width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
       })
    y += 10
  }
  
  // Linha separadora
  y += 5
  doc.moveTo(STYLES.margins.left, y)
     .lineTo(doc.page.width - STYLES.margins.right, y)
     .strokeColor(STYLES.colors.black)
     .lineWidth(2)
     .stroke()
  
  return y + 15
}

// ============================================
// DADOS DO PACIENTE (CFM 2.299/2021 Art. 2º)
// ============================================

function drawPatientInfo(doc: PDFDoc, patient: PatientInfo, y: number): number {
  doc.font(STYLES.fonts.heading)
     .fontSize(STYLES.sizes.subheading)
     .fillColor(STYLES.colors.black)
  
  // Nome do paciente
  doc.text(`Paciente: `, STYLES.margins.left, y, { continued: true })
     .font(STYLES.fonts.body)
     .text(patient.name)
  
  y += 16
  
  // Documento
  let docText = patient.documentNumber
  if (patient.documentType === 'CPF') {
    docText = formatCPF(patient.documentNumber)
  }
  
  doc.font(STYLES.fonts.heading)
     .text(`${patient.documentType || 'Documento'}: `, STYLES.margins.left, y, { continued: true })
     .font(STYLES.fonts.body)
     .text(docText)
  
  // Idade (se tiver data de nascimento)
  if (patient.birthDate) {
    const age = patient.age || calculateAge(patient.birthDate)
    doc.font(STYLES.fonts.heading)
       .text(`Idade: `, STYLES.margins.left + 250, y, { continued: true })
       .font(STYLES.fonts.body)
       .text(`${age} anos`)
  }
  
  y += 16
  
  // Data de nascimento
  if (patient.birthDate) {
    doc.font(STYLES.fonts.heading)
       .text(`Data de Nascimento: `, STYLES.margins.left, y, { continued: true })
       .font(STYLES.fonts.body)
       .text(formatDate(patient.birthDate))
  }
  
  y += 16
  
  // Endereço do paciente (se houver)
  if (patient.address) {
    doc.font(STYLES.fonts.heading)
       .text(`Endereço: `, STYLES.margins.left, y, { continued: true })
       .font(STYLES.fonts.body)
       .text(patient.address)
    y += 14
  }
  
  return y + 10
}

/** Superinscrição no padrão CFM/Memed: Nome, CPF, Endereço (uma linha cada). */
function drawPrescriptionPatientBlock(doc: PDFDoc, patient: PatientInfo, y: number): number {
  doc.font(STYLES.fonts.body)
     .fontSize(STYLES.sizes.body)
     .fillColor(STYLES.colors.black)
     .text(`Nome: ${patient.name}`, STYLES.margins.left, y)
  y += 14

  const docNum = patient.documentType === 'CPF' ? formatCPF(patient.documentNumber) : patient.documentNumber
  doc.text(`CPF: ${docNum}`, STYLES.margins.left, y)
  y += 14

  if (patient.birthDate) {
    const age = patient.age ?? calculateAge(patient.birthDate)
    doc.text(`Data de nascimento: ${formatDate(patient.birthDate)} (${age} anos)`, STYLES.margins.left, y)
    y += 14
  }

  if (patient.address) {
    doc.text(`Endereço: ${patient.address}`, STYLES.margins.left, y)
    y += 14
  }

  return y + 6
}

/** Cabeçalho do médico para prescrição no padrão CFM/Memed: nome, CRM, link de validação. */
function drawPrescriptionDoctorHeader(doc: PDFDoc, doctor: DoctorInfo, verificationUrl: string, y: number): number {
  // Nome (formato Memed: "Dr. Nome" ou NOME em maiúsculas)
  doc.font(STYLES.fonts.heading)
     .fontSize(STYLES.sizes.title)
     .fillColor(STYLES.colors.black)
     .text(doctor.name.toUpperCase(), STYLES.margins.left, y)
  y += 18

  // CRM/UF e Especialidade (CFM 2.299/2021)
  let crmLine = `CRM ${doctor.crm}/${doctor.crmState}`
  if (doctor.rqe) crmLine += ` • RQE ${doctor.rqe}`
  if (doctor.specialty) crmLine += ` • ${doctor.specialty}`
  doc.font(STYLES.fonts.body)
     .fontSize(STYLES.sizes.body)
     .fillColor(STYLES.colors.darkGray)
     .text(crmLine, STYLES.margins.left, y)
  y += 14

  // Endereço e contato (opcional, como no CFM)
  if (doctor.address || doctor.phone) {
    const contactLine = [doctor.address, doctor.phone && `Tel: ${doctor.phone}`, doctor.clinicName].filter(Boolean).join(' | ')
    doc.font(STYLES.fonts.body)
       .fontSize(STYLES.sizes.small)
       .fillColor(STYLES.colors.gray)
       .text(contactLine, STYLES.margins.left, y, {
         width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
       })
    y += 12
  }

  // Linha separadora
  y += 4
  doc.moveTo(STYLES.margins.left, y)
     .lineTo(doc.page.width - STYLES.margins.right, y)
     .strokeColor(STYLES.colors.black)
     .lineWidth(1)
     .stroke()
  return y + 14
}

// ============================================
// GERADOR DE PRESCRIÇÃO (Layout Memed-style)
// ============================================

// Cores do layout Memed
const MEMED_COLORS = {
  primary: '#0066CC',      // Azul principal
  secondary: '#4A90D9',    // Azul claro
  accent: '#00A3E0',       // Azul destaque
  text: '#333333',         // Texto principal
  textLight: '#666666',    // Texto secundário
  border: '#E0E0E0',       // Bordas
  background: '#F8F9FA',   // Fundo cards
  white: '#FFFFFF',
  red: '#DC3545',          // Controlados
  orange: '#FD7E14',       // Antimicrobianos
}

export async function generatePrescriptionPdf(
  prescription: PrescriptionDocument,
  verificationUrl: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      const doc: PDFDoc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      registerPdfFonts(doc)
      
      const pageWidth = doc.page.width
      const contentWidth = pageWidth - 80 // 40 left + 40 right margins
      let y = 30
      
      // ===== CABEÇALHO COMPACTO (estilo Memed) =====
      // Linha superior com nome do médico
      doc.font(STYLES.fonts.heading)
         .fontSize(14)
         .fillColor(MEMED_COLORS.primary)
         .text(prescription.doctor.name.toUpperCase(), 40, y)
      
      // CRM ao lado direito
      doc.font(STYLES.fonts.body)
         .fontSize(9)
         .fillColor(MEMED_COLORS.textLight)
         .text(`CRM ${prescription.doctor.crm}/${prescription.doctor.crmState}`, 40, y + 2, {
           width: contentWidth,
           align: 'right'
         })
      
      y += 18
      
      // Especialidade (se houver)
      if (prescription.doctor.specialty) {
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.textLight)
           .text(prescription.doctor.specialty, 40, y)
        y += 12
      }
      
      // Endereço/Clínica em linha única
      if (prescription.doctor.clinicName || prescription.doctor.address) {
        doc.font(STYLES.fonts.body)
           .fontSize(7)
           .fillColor(MEMED_COLORS.textLight)
           .text(
             [prescription.doctor.clinicName, prescription.doctor.address].filter(Boolean).join(' • '),
             40, y, { width: contentWidth }
           )
        y += 10
      }
      
      // Linha separadora fina
      y += 5
      doc.moveTo(40, y).lineTo(pageWidth - 40, y)
         .strokeColor(MEMED_COLORS.border).lineWidth(0.5).stroke()
      y += 10
      
      // ===== DADOS DO PACIENTE (linha compacta) =====
      doc.font(STYLES.fonts.heading)
         .fontSize(9)
         .fillColor(MEMED_COLORS.text)
         .text('Paciente: ', 40, y, { continued: true })
         .font(STYLES.fonts.body)
         .text(prescription.patient.name)
      
      y += 12
      
      // CPF e Data de nascimento na mesma linha
      const patientDetails: string[] = []
      if (prescription.patient.documentNumber && prescription.patient.documentNumber !== 'Não informado') {
        patientDetails.push(`CPF: ${formatCpf(prescription.patient.documentNumber)}`)
      }
      if (prescription.patient.birthDate) {
        const age = calculateAge(prescription.patient.birthDate)
        patientDetails.push(`Nascimento: ${formatDate(prescription.patient.birthDate)} (${age} anos)`)
      }
      
      if (patientDetails.length > 0) {
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.textLight)
           .text(patientDetails.join('  •  '), 40, y)
        y += 12
      }
      
      y += 8
      
      // ===== TÍTULO DA PRESCRIÇÃO =====
      const usageText = prescription.usageType === 'INTERNAL' ? 'USO INTERNO' :
                        prescription.usageType === 'EXTERNAL' ? 'USO EXTERNO' : 'USO INTERNO E EXTERNO'
      
      doc.font(STYLES.fonts.heading)
         .fontSize(10)
         .fillColor(MEMED_COLORS.primary)
         .text(usageText, 40, y, { width: contentWidth, align: 'center', underline: true })
      
      y += 20
      
      // ===== MEDICAMENTOS EM CARDS =====
      for (let i = 0; i < prescription.medications.length; i++) {
        const med = prescription.medications[i]
        const classification = classifyMedication(med.genericName)
        
        // Verificar se precisa nova página
        if (y > doc.page.height - 150) {
          doc.addPage()
          y = 30
        }
        
        // Card do medicamento
        const cardHeight = 65 + (med.instructions ? 12 : 0) + (classification.isControlled ? 10 : 0)
        const cardY = y
        
        // Borda esquerda colorida (azul para normal, vermelho para controlado)
        const borderColor = classification.isControlled ? MEMED_COLORS.red : 
                           classification.isAntimicrobial ? MEMED_COLORS.orange : MEMED_COLORS.primary
        
        doc.rect(40, cardY, 3, cardHeight).fill(borderColor)
        
        // Fundo do card
        doc.rect(43, cardY, contentWidth - 3, cardHeight)
           .fillColor(MEMED_COLORS.background).fill()
        
        // Borda do card
        doc.rect(43, cardY, contentWidth - 3, cardHeight)
           .strokeColor(MEMED_COLORS.border).lineWidth(0.5).stroke()
        
        let cardContentY = cardY + 8
        
        // Número e nome do medicamento
        doc.font(STYLES.fonts.heading)
           .fontSize(10)
           .fillColor(MEMED_COLORS.text)
           .text(`${i + 1}. ${med.genericName}`, 52, cardContentY)
        
        // Badge de controlado/antimicrobiano
        if (classification.isControlled) {
          doc.font(STYLES.fonts.heading)
             .fontSize(6)
             .fillColor(MEMED_COLORS.red)
             .text('CONTROLADO', pageWidth - 100, cardContentY + 2)
        } else if (classification.isAntimicrobial) {
          doc.font(STYLES.fonts.heading)
             .fontSize(6)
             .fillColor(MEMED_COLORS.orange)
             .text('ANTIMICROBIANO', pageWidth - 110, cardContentY + 2)
        }
        
        cardContentY += 14
        
        // Concentração e forma farmacêutica
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.textLight)
           .text(`${med.concentration} - ${med.pharmaceuticalForm}`, 52, cardContentY)
        
        cardContentY += 12
        
        // Posologia
        const routeLabel = med.route === 'oral' ? 'oral' : med.route
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.text)
           .text(`${med.dosage} por via ${routeLabel} ${med.frequency}`, 52, cardContentY, {
             width: contentWidth - 20
           })
        
        cardContentY += 12
        
        // Duração e quantidade
        let quantityText = `${med.duration} • Enviar ${med.quantity} ${med.quantityUnit}`
        if (classification.isControlled) {
          const written = med.quantityWritten || numberToWords(med.quantity)
          quantityText = `${med.duration} • Enviar ${med.quantity} (${written}) ${med.quantityUnit}`
        }
        
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.textLight)
           .text(quantityText, 52, cardContentY)
        
        cardContentY += 12
        
        // Instruções (se houver)
        if (med.instructions) {
          doc.font(STYLES.fonts.italic)
             .fontSize(7)
             .fillColor(MEMED_COLORS.textLight)
             .text(`Obs: ${med.instructions}`, 52, cardContentY, { width: contentWidth - 20 })
        }
        
        y = cardY + cardHeight + 8
      }
      
      // ===== OBSERVAÇÕES GERAIS =====
      if (prescription.notes) {
        if (y > doc.page.height - 100) {
          doc.addPage()
          y = 30
        }
        
        doc.font(STYLES.fonts.heading)
           .fontSize(8)
           .fillColor(MEMED_COLORS.text)
           .text('Observações:', 40, y)
        y += 12
        
        doc.font(STYLES.fonts.body)
           .fontSize(8)
           .fillColor(MEMED_COLORS.textLight)
           .text(prescription.notes, 40, y, { width: contentWidth })
        
        y += doc.heightOfString(prescription.notes, { width: contentWidth }) + 10
      }
      
      // ===== BLOCO DE ASSINATURA =====
      y += 30
      
      // Data e local
      const dateStr = formatDate(prescription.issuedAt)
      doc.font(STYLES.fonts.body)
         .fontSize(8)
         .fillColor(MEMED_COLORS.textLight)
         .text(`${prescription.doctor.city || 'Local'}, ${dateStr}`, 40, y, {
           width: contentWidth - 100,
           align: 'center'
         })
      
      y += 20
      
      // Linha de assinatura
      const lineStartX = (pageWidth - 180) / 2 - 50
      doc.moveTo(lineStartX, y).lineTo(lineStartX + 180, y)
         .strokeColor(MEMED_COLORS.text).lineWidth(0.5).stroke()
      
      y += 8
      
      // Nome do médico
      doc.font(STYLES.fonts.heading)
         .fontSize(9)
         .fillColor(MEMED_COLORS.text)
         .text(prescription.doctor.name, 40, y, {
           width: contentWidth - 100,
           align: 'center'
         })
      
      y += 12
      
      // CRM
      doc.font(STYLES.fonts.body)
         .fontSize(8)
         .fillColor(MEMED_COLORS.textLight)
         .text(`CRM ${prescription.doctor.crm}/${prescription.doctor.crmState}`, 40, y, {
           width: contentWidth - 100,
           align: 'center'
         })
      
      y += 10
      
      // Assinatura digital
      doc.font(STYLES.fonts.italic)
         .fontSize(6)
         .fillColor(MEMED_COLORS.textLight)
         .text(
           `Assinado digitalmente em ${formatDateTime(prescription.issuedAt)}`,
           40, y, { width: contentWidth - 100, align: 'center' }
         )
      
      // ===== QR CODE (ao lado da assinatura) =====
      const signatureEndY = y
      try {
        const qrBuffer = await generateQRCode(verificationUrl)
        const qrX = pageWidth - 40 - 55
        const qrY = signatureEndY - 60 // Alinhado com o bloco de assinatura
        
        doc.image(qrBuffer, qrX, qrY, { width: 50, height: 50 })
        
        doc.font(STYLES.fonts.body)
           .fontSize(5)
           .fillColor(MEMED_COLORS.textLight)
           .text('Verifique em', qrX, qrY + 52, { width: 50, align: 'center' })
           .text('validar.iti.gov.br', qrX, qrY + 58, { width: 50, align: 'center' })
      } catch (e) {
        logger.warn('Erro ao gerar QR Code:', e)
      }
      
      // ===== RODAPÉ (posição relativa ao conteúdo) =====
      y += 40
      doc.font(STYLES.fonts.body)
         .fontSize(5)
         .fillColor(MEMED_COLORS.border)
         .text(
           `Documento assinado digitalmente • CFM 2.299/2021 • Lei 14.063/2020 • ID: ${prescription.prescriptionId}`,
           40, y, { width: contentWidth, align: 'center' }
         )
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// Helper para formatar CPF
function formatCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return cpf
  return `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9,11)}`
}

// ============================================
// GERADOR DE ATESTADO MÉDICO
// ============================================

export async function generateCertificatePdf(
  certificate: MedicalCertificateDocument,
  verificationUrl: string
): Promise<Buffer> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new PDFDocument({
        size: 'A4',
        margins: STYLES.margins,
        autoFirstPage: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      registerPdfFonts(doc)
      let y = STYLES.margins.top
      
      // Cabeçalho do médico
      y = drawDoctorHeader(doc, certificate.doctor, y)
      
      // Título
      y += 15
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.title)
         .fillColor(STYLES.colors.black)
         .text(certificate.title.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 10
      
      // Número do atestado
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .fillColor(STYLES.colors.gray)
         .text(`Nº ${certificate.sequenceNumber}/${certificate.year}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 30
      
      // Dados do paciente
      y = drawPatientInfo(doc, certificate.patient, y)
      
      y += 20
      
      // Tipo de atestado e período
      if (certificate.certificateType === 'MEDICAL_LEAVE' && certificate.days) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.subheading)
           .fillColor(STYLES.colors.black)
           .text(`Período de Afastamento: ${certificate.days} dia(s)`, STYLES.margins.left, y)
        
        y += 16
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .text(`De ${formatDate(certificate.startDate)} a ${certificate.endDate ? formatDate(certificate.endDate) : 'N/A'}`,
                 STYLES.margins.left, y)
        
        y += 20
      }
      
      // CID (se incluído)
      if (certificate.includeCid && certificate.cidCode) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text(`CID-10: `, STYLES.margins.left, y, { continued: true })
           .font(STYLES.fonts.body)
           .text(`${certificate.cidCode}${certificate.cidDescription ? ` - ${certificate.cidDescription}` : ''}`)
        
        y += 20
      }
      
      // Conteúdo do atestado
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.black)
         .text(certificate.content, STYLES.margins.left, y, {
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           align: 'justify',
           lineGap: 4,
         })
      
      y += doc.heightOfString(certificate.content, {
        width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
      }) + 30
      
      // Data e assinatura
      y = Math.max(y, doc.page.height - 180)
      
      const dateCity = `${certificate.doctor.city || 'Local'}, ${formatDate(certificate.issuedAt)}`
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .text(dateCity, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 40
      
      // Linha de assinatura
      const lineWidth = 200
      const lineX = (doc.page.width - lineWidth) / 2
      doc.moveTo(lineX, y)
         .lineTo(lineX + lineWidth, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 10
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .text(certificate.doctor.name.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 14
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .text(`CRM-${certificate.doctor.crmState} ${certificate.doctor.crm}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      // QR Code
      try {
        const qrBuffer = await generateQRCode(verificationUrl)
        doc.image(qrBuffer, doc.page.width - STYLES.margins.right - 80, doc.page.height - STYLES.margins.bottom - 100, {
          width: 70,
          height: 70,
        })
      } catch (e) {
        logger.warn('Erro ao gerar QR Code:', e)
      }
      
      // Rodapé
      doc.font(STYLES.fonts.body)
         .fontSize(6)
         .fillColor(STYLES.colors.lightGray)
         .text(
           `Atestado assinado digitalmente • CFM 2.299/2021 • ID: ${certificate.certificateId}`,
           STYLES.margins.left,
           doc.page.height - 30,
           {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           }
         )
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// ============================================
// GERADOR DE ENCAMINHAMENTO
// ============================================

export async function generateReferralPdf(
  referral: ReferralDocument,
  verificationUrl: string
): Promise<Buffer> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new PDFDocument({
        size: 'A4',
        margins: STYLES.margins,
        autoFirstPage: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      registerPdfFonts(doc)
      let y = STYLES.margins.top
      
      // Cabeçalho do médico
      y = drawDoctorHeader(doc, referral.doctor, y)
      
      // Título
      y += 15
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.title)
         .fillColor(STYLES.colors.black)
         .text('ENCAMINHAMENTO MÉDICO', STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 30
      
      // Dados do paciente
      y = drawPatientInfo(doc, referral.patient, y)
      
      y += 20
      
      // Destino
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.subheading)
         .fillColor(STYLES.colors.black)
         .text('ENCAMINHAMENTO PARA:', STYLES.margins.left, y)
      
      y += 16
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .text(`Especialidade: ${referral.targetSpecialty}`, STYLES.margins.left + 20, y)
      
      y += 14
      
      if (referral.targetDoctor) {
        doc.text(`Médico: ${referral.targetDoctor}`, STYLES.margins.left + 20, y)
        y += 14
      }
      
      if (referral.targetUnit) {
        doc.text(`Unidade: ${referral.targetUnit}`, STYLES.margins.left + 20, y)
        y += 14
      }
      
      // Prioridade
      y += 10
      const priorityColors: Record<string, string> = {
        ROUTINE: STYLES.colors.black,
        URGENT: STYLES.colors.orange,
        EMERGENCY: STYLES.colors.red,
      }
      const priorityLabels: Record<string, string> = {
        ROUTINE: 'Rotina',
        URGENT: 'Urgente',
        EMERGENCY: 'Emergência',
      }
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .fillColor(priorityColors[referral.priority] || STYLES.colors.black)
         .text(`Prioridade: ${priorityLabels[referral.priority] || referral.priority}`, STYLES.margins.left, y)
      
      y += 25
      
      // Motivo
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.subheading)
         .fillColor(STYLES.colors.black)
         .text('MOTIVO DO ENCAMINHAMENTO:', STYLES.margins.left, y)
      
      y += 16
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .text(referral.reason, STYLES.margins.left, y, {
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += doc.heightOfString(referral.reason, {
        width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
      }) + 20
      
      // Hipótese diagnóstica
      if (referral.diagnosticHypothesis || referral.cidCode) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text('Hipótese Diagnóstica:', STYLES.margins.left, y)
        
        y += 14
        
        let diagText = referral.diagnosticHypothesis || ''
        if (referral.cidCode) {
          diagText += ` (CID: ${referral.cidCode})`
        }
        
        doc.font(STYLES.fonts.body)
           .text(diagText, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += 20
      }
      
      // Histórico clínico
      if (referral.clinicalHistory) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text('Resumo Clínico:', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .text(referral.clinicalHistory, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += doc.heightOfString(referral.clinicalHistory, {
          width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
        }) + 20
      }
      
      // Medicações em uso
      if (referral.currentMedications) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text('Medicações em Uso:', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .text(referral.currentMedications, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += 20
      }
      
      // Data e assinatura
      y = Math.max(y + 30, doc.page.height - 150)
      
      const dateCity = `${referral.doctor.city || 'Local'}, ${formatDate(referral.issuedAt)}`
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.black)
         .text(dateCity, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 35
      
      const lineWidth = 200
      const lineX = (doc.page.width - lineWidth) / 2
      doc.moveTo(lineX, y)
         .lineTo(lineX + lineWidth, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 10
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .text(referral.doctor.name.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 14
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .text(`CRM-${referral.doctor.crmState} ${referral.doctor.crm}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      // QR Code
      try {
        const qrBuffer = await generateQRCode(verificationUrl)
        doc.image(qrBuffer, doc.page.width - STYLES.margins.right - 80, doc.page.height - STYLES.margins.bottom - 100, {
          width: 70,
          height: 70,
        })
      } catch (e) {
        logger.warn('Erro ao gerar QR Code:', e)
      }
      
      // Rodapé
      doc.font(STYLES.fonts.body)
         .fontSize(6)
         .fillColor(STYLES.colors.lightGray)
         .text(
           `Encaminhamento assinado digitalmente • CFM 2.299/2021 • ID: ${referral.referralId}`,
           STYLES.margins.left,
           doc.page.height - 30,
           {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           }
         )
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// ============================================
// GERADOR DE SOLICITAÇÃO DE EXAME
// ============================================

export async function generateExamRequestPdf(
  request: ExamRequestDocument,
  verificationUrl: string
): Promise<Buffer> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new PDFDocument({
        size: 'A4',
        margins: STYLES.margins,
        autoFirstPage: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      registerPdfFonts(doc)
      let y = STYLES.margins.top
      
      // Cabeçalho do médico
      y = drawDoctorHeader(doc, request.doctor, y)
      
      // Título
      y += 15
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.title)
         .fillColor(STYLES.colors.black)
         .text('SOLICITAÇÃO DE EXAMES', STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 30
      
      // Dados do paciente
      y = drawPatientInfo(doc, request.patient, y)
      
      y += 15
      
      // Prioridade
      const priorityColors: Record<string, string> = {
        ROUTINE: STYLES.colors.black,
        URGENT: STYLES.colors.orange,
        EMERGENCY: STYLES.colors.red,
      }
      const priorityLabels: Record<string, string> = {
        ROUTINE: 'Rotina',
        URGENT: 'Urgente',
        EMERGENCY: 'Emergência',
      }
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .fillColor(priorityColors[request.priority] || STYLES.colors.black)
         .text(`Prioridade: ${priorityLabels[request.priority] || request.priority}`, STYLES.margins.left, y)
      
      y += 25
      
      // Indicação clínica
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.subheading)
         .fillColor(STYLES.colors.black)
         .text('INDICAÇÃO CLÍNICA:', STYLES.margins.left, y)
      
      y += 16
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .text(request.clinicalIndication, STYLES.margins.left, y, {
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += doc.heightOfString(request.clinicalIndication, {
        width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
      }) + 20
      
      // Hipótese diagnóstica
      if (request.diagnosticHypothesis || request.cidCode) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text('Hipótese Diagnóstica:', STYLES.margins.left, y)
        
        y += 14
        
        let diagText = request.diagnosticHypothesis || ''
        if (request.cidCode) {
          diagText += ` (CID: ${request.cidCode})`
        }
        
        doc.font(STYLES.fonts.body)
           .text(diagText.trim(), STYLES.margins.left, y)
        
        y += 20
      }
      
      // Lista de exames
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.subheading)
         .fillColor(STYLES.colors.black)
         .text('EXAMES SOLICITADOS:', STYLES.margins.left, y)
      
      y += 20
      
      for (let i = 0; i < request.exams.length; i++) {
        const exam = request.exams[i]
        
        // Verificar se precisa nova página
        if (y > doc.page.height - 150) {
          doc.addPage()
          y = STYLES.margins.top
        }
        
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text(`${i + 1}. ${exam.name}`, STYLES.margins.left, y)
        
        y += 14
        
        if (exam.code) {
          doc.font(STYLES.fonts.body)
             .fontSize(STYLES.sizes.small)
             .fillColor(STYLES.colors.gray)
             .text(`Código: ${exam.code}`, STYLES.margins.left + 20, y)
          y += 12
        }
        
        if (exam.material) {
          doc.font(STYLES.fonts.body)
             .fontSize(STYLES.sizes.small)
             .fillColor(STYLES.colors.darkGray)
             .text(`Material: ${exam.material}`, STYLES.margins.left + 20, y)
          y += 12
        }
        
        if (exam.notes) {
          doc.font(STYLES.fonts.italic)
             .fontSize(STYLES.sizes.small)
             .text(`Obs: ${exam.notes}`, STYLES.margins.left + 20, y)
          y += 12
        }
        
        y += 8
      }
      
      // Instruções de preparo
      if (request.preparation) {
        y += 10
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.black)
           .text('Instruções de Preparo:', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .text(request.preparation, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += 20
      }
      
      // Data e assinatura
      y = Math.max(y + 20, doc.page.height - 150)
      
      const dateCity = `${request.doctor.city || 'Local'}, ${formatDate(request.issuedAt)}`
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.black)
         .text(dateCity, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 35
      
      const lineWidth = 200
      const lineX = (doc.page.width - lineWidth) / 2
      doc.moveTo(lineX, y)
         .lineTo(lineX + lineWidth, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 10
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .text(request.doctor.name.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 14
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .text(`CRM-${request.doctor.crmState} ${request.doctor.crm}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      // QR Code
      try {
        const qrBuffer = await generateQRCode(verificationUrl)
        doc.image(qrBuffer, doc.page.width - STYLES.margins.right - 80, doc.page.height - STYLES.margins.bottom - 100, {
          width: 70,
          height: 70,
        })
      } catch (e) {
        logger.warn('Erro ao gerar QR Code:', e)
      }
      
      // Rodapé
      doc.font(STYLES.fonts.body)
         .fontSize(6)
         .fillColor(STYLES.colors.lightGray)
         .text(
           `Solicitação assinada digitalmente • CFM 2.299/2021 • ID: ${request.requestId}`,
           STYLES.margins.left,
           doc.page.height - 30,
           {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           }
         )
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
