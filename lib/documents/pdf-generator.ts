/**
 * Gerador de PDF para Documentos Médicos
 * 
 * Gera PDFs profissionais em conformidade com CFM 2.299/2021
 * Usa PDFKit para geração nativa de PDF (sem conversão HTML)
 */

import PDFDocument from 'pdfkit'
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

// ============================================
// GERADOR DE PRESCRIÇÃO
// ============================================

export async function generatePrescriptionPdf(
  prescription: PrescriptionDocument,
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
        bufferPages: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      let y = STYLES.margins.top
      
      // ===== CABEÇALHO DO MÉDICO =====
      y = drawDoctorHeader(doc, prescription.doctor, y)
      
      // ===== TÍTULO =====
      y += 10
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.title)
         .fillColor(STYLES.colors.black)
         .text('PRESCRIÇÃO MÉDICA', STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 25
      
      // ===== DADOS DO PACIENTE =====
      y = drawPatientInfo(doc, prescription.patient, y)
      
      // ===== INDICAÇÃO DE USO =====
      const usageText = prescription.usageType === 'INTERNAL' ? 'USO INTERNO' :
                        prescription.usageType === 'EXTERNAL' ? 'USO EXTERNO' : 'USO INTERNO E EXTERNO'
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.subheading)
         .fillColor(STYLES.colors.black)
         .text(`➜ ${usageText} ➜`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           underline: true,
         })
      
      y += 25
      
      // ===== AVISOS DE MEDICAMENTOS ESPECIAIS =====
      const hasControlled = prescription.medications.some(m => {
        const c = classifyMedication(m.genericName)
        return c.isControlled
      })
      
      const hasAntimicrobial = prescription.medications.some(m => {
        const c = classifyMedication(m.genericName)
        return c.isAntimicrobial
      })
      
      if (hasControlled) {
        doc.rect(STYLES.margins.left, y, doc.page.width - STYLES.margins.left - STYLES.margins.right, 35)
           .fillColor('#FEF2F2')
           .fill()
        
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.small)
           .fillColor(STYLES.colors.red)
           .text('⚠️ MEDICAMENTO CONTROLADO - PORTARIA 344/98', STYLES.margins.left + 10, y + 8)
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.tiny)
           .text('Quantidade expressa por extenso. Verifique conformidade com lista de substâncias controladas.', 
                 STYLES.margins.left + 10, y + 22)
        
        y += 45
      }
      
      if (hasAntimicrobial) {
        doc.rect(STYLES.margins.left, y, doc.page.width - STYLES.margins.left - STYLES.margins.right, 30)
           .fillColor('#FFFBEB')
           .fill()
        
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.small)
           .fillColor(STYLES.colors.orange)
           .text('⚕️ ANTIMICROBIANO - Validade 10 dias (RDC 20/2011)', STYLES.margins.left + 10, y + 10)
        
        y += 40
      }
      
      // ===== MEDICAMENTOS =====
      for (let i = 0; i < prescription.medications.length; i++) {
        const med = prescription.medications[i]
        const classification = classifyMedication(med.genericName)
        
        // Verificar se precisa nova página
        if (y > doc.page.height - 200) {
          doc.addPage()
          y = STYLES.margins.top
        }
        
        // Número e nome do medicamento
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.subheading)
           .fillColor(STYLES.colors.black)
           .text(`${i + 1}. ${med.genericName.toUpperCase()}`, STYLES.margins.left, y)
        
        y += 16
        
        // Concentração e forma
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
           .text(`${med.concentration} • ${med.pharmaceuticalForm}`, STYLES.margins.left + 20, y)
        
        y += 14
        
        // Quantidade
        let quantityText = `Quantidade: ${med.quantity} ${med.quantityUnit}`
        if (classification.isControlled && med.quantityWritten) {
          quantityText += ` (${med.quantityWritten.toUpperCase()})`
        }
        
        doc.font(STYLES.fonts.body)
           .text(quantityText, STYLES.margins.left + 20, y)
        
        y += 16
        
        // Posologia
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .text('Posologia: ', STYLES.margins.left + 20, y, { continued: true })
           .font(STYLES.fonts.body)
        
        const posologyText = `${med.dosage} por via ${med.route} ${med.frequency}, ${med.duration}`
        doc.text(posologyText + (med.maxDailyDose ? `. ${med.maxDailyDose}` : ''))
        
        y += 14
        
        // Instruções adicionais
        if (med.instructions) {
          doc.font(STYLES.fonts.italic)
             .fontSize(STYLES.sizes.small)
             .fillColor(STYLES.colors.gray)
             .text(`Obs: ${med.instructions}`, STYLES.margins.left + 20, y)
          y += 12
        }
        
        // Marcadores de controle
        if (classification.isControlled) {
          doc.font(STYLES.fonts.heading)
             .fontSize(STYLES.sizes.tiny)
             .fillColor(STYLES.colors.red)
             .text(`🔒 CONTROLADO (Lista ${classification.controlledType})`, STYLES.margins.left + 20, y)
          y += 12
        }
        
        if (classification.isAntimicrobial) {
          doc.font(STYLES.fonts.heading)
             .fontSize(STYLES.sizes.tiny)
             .fillColor(STYLES.colors.orange)
             .text('⚕️ ANTIMICROBIANO', STYLES.margins.left + 20, y)
          y += 12
        }
        
        y += 15
      }
      
      // ===== OBSERVAÇÕES =====
      if (prescription.notes) {
        y += 10
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.black)
           .text('Observações:', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
           .text(prescription.notes, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += doc.heightOfString(prescription.notes, {
          width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
        }) + 10
      }
      
      // ===== RODAPÉ - DATA E ASSINATURA =====
      y = Math.max(y + 30, doc.page.height - 180)
      
      // Data e cidade
      const dateCity = `${prescription.doctor.city || 'Local'}, ${formatDate(prescription.issuedAt)}`
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.black)
         .text(dateCity, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 30
      
      // Linha de assinatura
      const lineWidth = 200
      const lineX = (doc.page.width - lineWidth) / 2
      doc.moveTo(lineX, y)
         .lineTo(lineX + lineWidth, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 10
      
      // Nome do médico
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.body)
         .text(prescription.doctor.name.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 14
      
      // CRM
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .text(`CRM-${prescription.doctor.crmState} ${prescription.doctor.crm}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      // ===== QR CODE =====
      try {
        const qrBuffer = await generateQRCode(verificationUrl)
        const qrX = doc.page.width - STYLES.margins.right - 80
        const qrY = doc.page.height - STYLES.margins.bottom - 100
        
        doc.image(qrBuffer, qrX, qrY, { width: 70, height: 70 })
        
        doc.font(STYLES.fonts.body)
           .fontSize(6)
           .fillColor(STYLES.colors.gray)
           .text('Verificar em:', qrX, qrY + 72, { width: 70, align: 'center' })
           .text('validar.iti.gov.br', qrX, qrY + 80, { width: 70, align: 'center' })
      } catch (e) {
        logger.warn('Erro ao gerar QR Code:', e)
      }
      
      // ===== RODAPÉ DE CONFORMIDADE =====
      const footerY = doc.page.height - 30
      doc.font(STYLES.fonts.body)
         .fontSize(6)
         .fillColor(STYLES.colors.lightGray)
         .text(
           'Documento assinado digitalmente conforme CFM 2.299/2021 • Portaria 344/98 • Lei 9.787/99',
           STYLES.margins.left,
           footerY,
           {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           }
         )
      
      doc.text(
        `ID: ${prescription.prescriptionId} • Emitido: ${formatDateTime(prescription.issuedAt)}`,
        STYLES.margins.left,
        footerY + 8,
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
        bufferPages: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
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
        bufferPages: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
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
        bufferPages: true,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
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
