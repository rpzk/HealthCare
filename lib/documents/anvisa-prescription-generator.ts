/**
 * Gerador de Prescrições com Templates ANVISA
 *
 * Usa os modelos oficiais da ANVISA como background e sobrepõe os dados
 * para garantir conformidade visual exata com RDC 1.000/2025.
 *
 * Templates disponíveis:
 * - Receita A (amarela): CONTROLLED_A
 * - Receita B (azul): CONTROLLED_B
 * - Receita de Controle Especial: CONTROLLED_C1, C4, C5
 */

import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import {
  PrescriptionDocument,
  MedicationItem,
} from './types'
import { numberToWords } from './validator'
import QRCode from 'qrcode'

export type AnvisaPrescriptionType =
  | 'CONTROLLED_A'
  | 'CONTROLLED_B'
  | 'CONTROLLED_B2'
  | 'CONTROLLED_C1'
  | 'CONTROLLED_C2'
  | 'CONTROLLED_C4'
  | 'CONTROLLED_C5'
  | 'CONTROLLED_TALIDOMIDA'

const A4_WIDTH = 595
const A4_HEIGHT = 842

// Strips A/B: 567 x 170 pts originais
const STRIP_WIDTH = 567
const STRIP_HEIGHT = 170
const STRIP_SCALE = A4_WIDTH / STRIP_WIDTH // 595/567
const STRIP_SCALED_HEIGHT = STRIP_HEIGHT * STRIP_SCALE // ~179 pts

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCPF(cpf: string): string {
  const digits = (cpf || '').replace(/\D/g, '')
  if (digits.length !== 11) return cpf || ''
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

async function generateQRCode(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    width: 70,
  })
}

function getTemplatePath(templateName: string): string {
  const base = path.join(process.cwd(), 'public', 'prescription-templates')
  const pngPath = path.join(base, `${templateName}.png`)
  if (fs.existsSync(pngPath)) return pngPath
  const altPath = path.join(base, `${templateName}-1.png`)
  if (fs.existsSync(altPath)) return altPath
  throw new Error(`Template ANVISA não encontrado: ${templateName}`)
}

function formatMedication(med: MedicationItem, quantityInWords: boolean): string {
  const parts: string[] = []
  parts.push(med.name ?? med.genericName ?? '')
  if (med.concentration) parts.push(med.concentration)
  if (med.pharmaceuticalForm) parts.push(`- ${med.pharmaceuticalForm}`)
  const qty = med.quantity ?? 1
  const unit = med.unit || med.quantityUnit || 'unidades'
  if (quantityInWords) {
    parts.push(`Quantidade: ${qty} (${numberToWords(qty)}) ${unit}`)
  } else {
    parts.push(`Quantidade: ${qty} ${unit}`)
  }
  parts.push(`Posologia: ${med.dosage ?? ''}`)
  if (med.frequency) parts.push(med.frequency)
  if (med.duration) parts.push(med.duration)
  if (med.instructions) parts.push(med.instructions)
  return parts.filter(Boolean).join('\n')
}

/**
 * Gera prescrição usando template Receita A ou B (formato tira)
 * Layout: 3 colunas - Notificação | Emitente/Comprador | Prescrição
 */
async function generateStripPrescription(
  prescription: PrescriptionDocument,
  options: {
    prescriptionType: 'CONTROLLED_A' | 'CONTROLLED_B' | 'CONTROLLED_B2' | 'CONTROLLED_C2' | 'CONTROLLED_TALIDOMIDA'
    templateName: string
    controlNumber?: string
    uf?: string
    viaNumber?: number
    expiresAt?: Date
    justification?: string
    buyerName?: string
    buyerDocument?: string
    buyerAddress?: string
    buyerPhone?: string
    verificationUrl?: string
  }
): Promise<Buffer> {
  const templatePath = getTemplatePath(options.templateName)
  const img = fs.readFileSync(templatePath)

  // eslint-disable-next-line no-async-promise-executor -- QR code requires await
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        bufferPages: false,
      })

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Background: tira escalada para largura A4
      doc.image(img, 0, 0, {
        width: A4_WIDTH,
        height: STRIP_SCALED_HEIGHT,
      })

      const f = 9 // fontSize
      doc.font('Helvetica').fontSize(f).fillColor('#000000')

      const col1X = 30
      const col2X = 210
      const col3X = 400
      const col1W = 160
      const col2W = 170
      const col3W = 175

      // Coluna 1
      let y = 35
      if (options.controlNumber) {
        doc.text(`Nº ${options.controlNumber}`, col1X, y, { width: col1W })
        y += 14
      }
      if (options.uf) {
        doc.text(`UF: ${options.uf}`, col1X, y, { width: col1W })
        y += 14
      }
      const issueDate = prescription.date || new Date()
      doc.text(`DATA: ${formatDate(issueDate)}`, col1X, y, { width: col1W })
      y += 22
      doc.text(`PACIENTE: ${prescription.patient.name}`, col1X, y, { width: col1W })
      y += 12
      const cpf = prescription.patient.cpf || prescription.patient.documentNumber
      doc.text(`CPF: ${formatCPF(cpf)}`, col1X, y, { width: col1W })

      // Coluna 2 - Emitente
      y = 35
      const emitente = [
        prescription.doctor.name.toUpperCase(),
        `CRM-${prescription.doctor.crmState} ${prescription.doctor.crm}`,
        prescription.doctor.specialty || '',
        prescription.doctor.clinicName || prescription.doctor.address || '',
        prescription.doctor.clinicCnpj ? `CNPJ: ${prescription.doctor.clinicCnpj}` : '',
        prescription.doctor.phone ? `Tel: ${prescription.doctor.phone}` : '',
      ].filter(Boolean)
      doc.text(emitente.join('\n'), col2X, y, { width: col2W, lineGap: 2 })
      y += 75

      // Comprador
      doc.font('Helvetica-Bold').fontSize(8).text('IDENTIFICAÇÃO DO COMPRADOR', col2X, y)
      y += 10
      doc.font('Helvetica').fontSize(f)
      doc.text(`Nome: ${options.buyerName || '___________________'}`, col2X, y)
      y += 10
      doc.text(`CPF: ${options.buyerDocument ? formatCPF(options.buyerDocument) : '___________________'}`, col2X, y)
      y += 10
      doc.text(`Endereço: ${options.buyerAddress || '___________________'}`, col2X, y, { width: col2W })
      y += 10
      doc.text(`Telefone: ${options.buyerPhone || '___________________'}`, col2X, y)

      // Coluna 3 - Prescrição
      y = 35
      const qtyInWords = true
      prescription.medications.forEach((med, i) => {
        const txt = `${i + 1}. ${formatMedication(med, qtyInWords)}`
        doc.text(txt, col3X, y, { width: col3W, lineGap: 2 })
        y += 45
      })

      if (options.justification) {
        doc.text(`Justificativa: ${options.justification}`, col3X, y, { width: col3W })
      }

      // Via
      if (options.viaNumber) {
        const viaLabel = options.viaNumber === 1 ? '1ª VIA - RETENÇÃO DA FARMÁCIA' : '2ª VIA - ORIENTAÇÃO DO PACIENTE'
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#DC2626')
        doc.text(viaLabel, A4_WIDTH / 2 - 80, STRIP_SCALED_HEIGHT - 15)
      }

      // QR Code
      if (options.verificationUrl) {
        try {
          const qr = await generateQRCode(options.verificationUrl)
          doc.image(qr, A4_WIDTH - 75, STRIP_SCALED_HEIGHT - 80, { width: 70, height: 70 })
        } catch {
          // ignora erro do QR
        }
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Gera prescrição usando template Receita de Controle Especial (A4)
 */
async function generateControleEspecialPrescription(
  prescription: PrescriptionDocument,
  options: {
    prescriptionType: 'CONTROLLED_C1' | 'CONTROLLED_C4' | 'CONTROLLED_C5'
    controlNumber?: string
    uf?: string
    viaNumber?: number
    expiresAt?: Date
    buyerName?: string
    buyerDocument?: string
    buyerAddress?: string
    buyerPhone?: string
    verificationUrl?: string
  }
): Promise<Buffer> {
  const templatePath = getTemplatePath('receita-controle-especial-1')
  const templatePath2 = getTemplatePath('receita-controle-especial-2')
  const img1 = fs.readFileSync(templatePath)
  const img2 = fs.readFileSync(templatePath2)

  // eslint-disable-next-line no-async-promise-executor -- QR code requires await
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        bufferPages: false,
      })

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Página 1 - Frente
      doc.image(img1, 0, 0, { width: A4_WIDTH, height: A4_HEIGHT })

      const mLeft = 50
      const mRight = A4_WIDTH - 50
      const lineH = 12
      let y = 90

      doc.font('Helvetica').fontSize(10).fillColor('#000000')

      // Emitente
      const emitente = [
        `${prescription.doctor.name.toUpperCase()} - CRM-${prescription.doctor.crmState} ${prescription.doctor.crm}`,
        prescription.doctor.specialty ? `Especialidade: ${prescription.doctor.specialty}` : '',
        prescription.doctor.clinicName || prescription.doctor.address || '',
        prescription.doctor.clinicCnpj ? `CNPJ/CNES: ${prescription.doctor.clinicCnpj}` : '',
        prescription.doctor.city ? `${prescription.doctor.city} - ${prescription.doctor.crmState}` : '',
        prescription.doctor.phone ? `Tel: ${prescription.doctor.phone}` : '',
      ].filter(Boolean)
      doc.text(emitente.join('\n'), mLeft, y, { width: mRight - mLeft, lineGap: 3 })
      y += 55

      // Paciente
      y = 195
      doc.text(`Nome: ${prescription.patient.name}`, mLeft, y)
      y += lineH
      const cpf = prescription.patient.cpf || prescription.patient.documentNumber
      doc.text(`CPF: ${formatCPF(cpf)}`, mLeft, y)
      y += 35

      // Prescrição
      y = 285
      const qtyInWords = true
      prescription.medications.forEach((med, i) => {
        const txt = `${i + 1}. ${formatMedication(med, qtyInWords)}`
        doc.text(txt, mLeft, y, { width: mRight - mLeft, lineGap: 2 })
        y += 55
      })

      // Data
      const issueDate = prescription.date || new Date()
      y = 650
      doc.text(`DATA: ${formatDate(issueDate)}`, mLeft, y)

      // Via
      if (options.viaNumber) {
        const viaLabel = options.viaNumber === 1 ? '1ª via - Retenção pela Farmácia' : '2ª via - Paciente'
        doc.fontSize(8).fillColor('#666666')
        doc.text(viaLabel, mRight - 120, A4_HEIGHT - 40)
      }

      // QR Code página 1
      if (options.verificationUrl) {
        try {
          const qr = await generateQRCode(options.verificationUrl)
          doc.image(qr, mRight - 75, A4_HEIGHT - 95, { width: 65, height: 65 })
        } catch {
          /* ignore */
        }
      }

      // Página 2 - Verso (Identificação do Comprador)
      doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } })
      doc.image(img2, 0, 0, { width: A4_WIDTH, height: A4_HEIGHT })

      doc.font('Helvetica').fontSize(10).fillColor('#000000')
      y = 380
      doc.text(`Nome: ${options.buyerName || '________________________________'}`, mLeft, y)
      y += lineH
      doc.text(`CPF: ${options.buyerDocument ? formatCPF(options.buyerDocument) : '________________________________'}`, mLeft, y)
      y += lineH
      doc.text(`Endereço: ${options.buyerAddress || '________________________________'}`, mLeft, y, { width: mRight - mLeft })
      y += lineH
      doc.text(`Telefone: ${options.buyerPhone || '________________________________'}`, mLeft, y)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Gera PDF de prescrição usando templates ANVISA.
 * Retorna null se o tipo não tiver template (usa fallback para CFM).
 */
export async function generateAnvisaPrescriptionPdf(
  prescription: PrescriptionDocument,
  options: {
    prescriptionType: AnvisaPrescriptionType
    controlNumber?: string
    uf?: string
    viaNumber?: number
    expiresAt?: Date
    justification?: string
    buyerName?: string
    buyerDocument?: string
    buyerAddress?: string
    buyerPhone?: string
    verificationUrl?: string
  }
): Promise<Buffer> {
  const stripOptions = {
    ...options,
    prescriptionType: options.prescriptionType as 'CONTROLLED_A' | 'CONTROLLED_B' | 'CONTROLLED_B2' | 'CONTROLLED_C2' | 'CONTROLLED_TALIDOMIDA',
  }
  const especialOptions = {
    ...options,
    prescriptionType: options.prescriptionType as 'CONTROLLED_C1' | 'CONTROLLED_C4' | 'CONTROLLED_C5',
  }
  switch (options.prescriptionType) {
    case 'CONTROLLED_A':
      return generateStripPrescription(prescription, { ...stripOptions, templateName: 'receita-a' })
    case 'CONTROLLED_B':
      return generateStripPrescription(prescription, { ...stripOptions, templateName: 'receita-b' })
    case 'CONTROLLED_B2':
      return generateStripPrescription(prescription, { ...stripOptions, templateName: 'receita-b2' })
    case 'CONTROLLED_C2':
      return generateStripPrescription(prescription, { ...stripOptions, templateName: 'receita-retinoides' })
    case 'CONTROLLED_TALIDOMIDA':
      return generateStripPrescription(prescription, { ...stripOptions, templateName: 'receita-talidomida' })
    case 'CONTROLLED_C1':
    case 'CONTROLLED_C4':
    case 'CONTROLLED_C5':
      return generateControleEspecialPrescription(prescription, especialOptions)
    default:
      throw new Error(`Tipo de prescrição sem template ANVISA: ${options.prescriptionType}`)
  }
}

/**
 * Verifica se o tipo de prescrição possui template ANVISA
 */
export function hasAnvisaTemplate(
  prescriptionType: string
): prescriptionType is AnvisaPrescriptionType {
  return [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_B2',
    'CONTROLLED_C1',
    'CONTROLLED_C2',
    'CONTROLLED_C4',
    'CONTROLLED_C5',
    'CONTROLLED_TALIDOMIDA',
  ].includes(prescriptionType)
}
