/**
 * Gerador CFM-Compliant para Prescrições Médicas (2026)
 * 
 * Implementa todos os requisitos da Portaria 344/98 + Atualizações ANVISA 2026
 * Resolução CFM 2.299/2021 (Assinatura Digital)
 * Manual de Orientações Básicas para Prescrição Médica (CFM)
 */

import PDFDocument from 'pdfkit'
import { 
  PrescriptionDocument, 
  MedicationItem,
  DoctorInfo,
  PatientInfo,
} from './types'
import { numberToWords } from './validator'
import QRCode from 'qrcode'

// ============================================
// TIPOS DE RECEITUÁRIO (conforme ANVISA 2026)
// ============================================

export type PrescriptionType =
  | 'SIMPLE'          // Receita simples (branca, 1 via)
  | 'ANTIMICROBIAL'   // Antibiótico (branca, 2 vias, 10 dias)
  | 'CONTROLLED_A'    // Notificação A (amarela, 2 vias, entorpecentes)
  | 'CONTROLLED_B'    // Notificação B (azul, 2 vias, psicotrópicos)
  | 'CONTROLLED_C1'   // Receita C1 (branca, 2 vias, outras controladas)
  | 'CONTROLLED_C4'   // Receita C4 (branca, 2 vias, antiretrovirais)
  | 'CONTROLLED_C5'   // Receita C5 (branca, 2 vias, anabolizantes)

// ============================================
// CONFIGURAÇÕES POR TIPO DE RECEITA
// ============================================

interface PrescriptionConfig {
  title: string
  color: string         // Cor de fundo do cabeçalho (se aplicável)
  requiresTwoVias: boolean
  validity: number      // Validade em dias
  requiresControlNumber: boolean
  requiresQuantityInWords: boolean
  requiresJustification: boolean
  requiresBuyerInfo: boolean
  requiresDispenserInfo: boolean
  maxAmpoules?: number
  requiresViaLabel: boolean
}

const PRESCRIPTION_CONFIGS: Record<PrescriptionType, PrescriptionConfig> = {
  SIMPLE: {
    title: 'RECEITUÁRIO MÉDICO',
    color: '#FFFFFF',
    requiresTwoVias: false,
    validity: 30,
    requiresControlNumber: false,
    requiresQuantityInWords: false,
    requiresJustification: false,
    requiresBuyerInfo: false,
    requiresDispenserInfo: false,
    requiresViaLabel: false,
  },
  ANTIMICROBIAL: {
    title: 'RECEITUÁRIO MÉDICO - ANTIMICROBIANO',
    color: '#FFFFFF',
    requiresTwoVias: true,
    validity: 10,
    requiresControlNumber: false,
    requiresQuantityInWords: false,
    requiresJustification: false,
    requiresBuyerInfo: false,
    requiresDispenserInfo: false,
    requiresViaLabel: true,
  },
  CONTROLLED_A: {
    title: 'NOTIFICAÇÃO DE RECEITA A (AMARELA)',
    color: '#FEF3C7', // Amarelo claro
    requiresTwoVias: true,
    validity: 30,
    requiresControlNumber: true,
    requiresQuantityInWords: true,
    requiresJustification: true,
    requiresBuyerInfo: true,
    requiresDispenserInfo: true,
    maxAmpoules: 5,
    requiresViaLabel: true,
  },
  CONTROLLED_B: {
    title: 'NOTIFICAÇÃO DE RECEITA B (AZUL)',
    color: '#DBEAFE', // Azul claro
    requiresTwoVias: true,
    validity: 30,
    requiresControlNumber: true,
    requiresQuantityInWords: true,
    requiresJustification: true,
    requiresBuyerInfo: true,
    requiresDispenserInfo: true,
    requiresViaLabel: true,
  },
  CONTROLLED_C1: {
    title: 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C1',
    color: '#FFFFFF',
    requiresTwoVias: true,
    validity: 30,
    requiresControlNumber: true,
    requiresQuantityInWords: true,
    requiresJustification: false,
    requiresBuyerInfo: true,
    requiresDispenserInfo: true,
    requiresViaLabel: true,
  },
  CONTROLLED_C4: {
    title: 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C4 (ANTIRETROVIRAIS)',
    color: '#FFFFFF',
    requiresTwoVias: true,
    validity: 180, // 6 meses
    requiresControlNumber: true,
    requiresQuantityInWords: true,
    requiresJustification: false,
    requiresBuyerInfo: true,
    requiresDispenserInfo: true,
    requiresViaLabel: true,
  },
  CONTROLLED_C5: {
    title: 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C5 (ANABOLIZANTES)',
    color: '#FFFFFF',
    requiresTwoVias: true,
    validity: 30,
    requiresControlNumber: true,
    requiresQuantityInWords: true,
    requiresJustification: false,
    requiresBuyerInfo: true,
    requiresDispenserInfo: true,
    requiresViaLabel: true,
  },
}

// ============================================
// ESTILOS
// ============================================

const STYLES = {
  fonts: {
    title: 'Helvetica-Bold',
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    italic: 'Helvetica-Oblique',
  },
  sizes: {
    title: 14,
    heading: 11,
    subheading: 10,
    body: 9,
    small: 8,
    tiny: 7,
  },
  colors: {
    black: '#000000',
    darkGray: '#333333',
    gray: '#666666',
    lightGray: '#999999',
    blue: '#2563EB',
    red: '#DC2626',
  },
  margins: {
    top: 40,
    bottom: 40,
    left: 40,
    right: 40,
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

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

async function generateQRCode(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    width: 80,
  })
}

// ============================================
// GERADOR PRINCIPAL DE PRESCRIÇÃO CFM-COMPLIANT
// ============================================

export async function generateCFMPrescriptionPdf(
  prescription: PrescriptionDocument,
  options: {
    prescriptionType: PrescriptionType
    controlNumber?: string
    uf?: string
    viaNumber?: number
    expiresAt?: Date
    justification?: string
    buyerName?: string
    buyerDocument?: string
    buyerAddress?: string
    buyerPhone?: string
  } = { prescriptionType: 'SIMPLE' }
): Promise<Buffer> {
  const config = PRESCRIPTION_CONFIGS[options.prescriptionType]
  
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = []
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new PDFDocument({
        size: 'A4',
        margins: {
          top: STYLES.margins.top,
          bottom: STYLES.margins.bottom,
          left: STYLES.margins.left,
          right: STYLES.margins.right,
        },
        autoFirstPage: true,
        bufferPages: false,
      })
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      
      let y = STYLES.margins.top
      
      // ============================================
      // CABEÇALHO: TIPO DE RECEITUÁRIO E NUMERAÇÃO
      // ============================================
      
      if (config.color !== '#FFFFFF') {
        // Fundo colorido para receitas controladas A e B
        doc.rect(0, 0, doc.page.width, 60)
           .fill(config.color)
      }
      
      doc.font(STYLES.fonts.title)
         .fontSize(STYLES.sizes.title)
         .fillColor(STYLES.colors.black)
         .text(config.title, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 18
      
      // Numeração de controle (obrigatória para controladas)
      if (config.requiresControlNumber && options.controlNumber) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.small)
           .text(`Nº ${options.controlNumber}`, STYLES.margins.left, y, {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        y += 12
      }
      
      // UF
      if (options.uf) {
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.small)
           .text(`UF: ${options.uf}`, STYLES.margins.left, y, {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        y += 12
      }
      
      // Indicação da via (1ª VIA ou 2ª VIA)
      if (config.requiresViaLabel && options.viaNumber) {
        const viaLabel = options.viaNumber === 1 
          ? '1ª VIA - RETENÇÃO DA FARMÁCIA' 
          : '2ª VIA - ORIENTAÇÃO DO PACIENTE'
        
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.small)
           .fillColor(STYLES.colors.red)
           .text(viaLabel, STYLES.margins.left, y, {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        y += 15
      } else {
        y += 10
      }
      
      // Linha separadora
      doc.moveTo(STYLES.margins.left, y)
         .lineTo(doc.page.width - STYLES.margins.right, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 15
      
      // ============================================
      // IDENTIFICAÇÃO DO PRESCRITOR (CFM obrigatório)
      // ============================================
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.heading)
         .fillColor(STYLES.colors.black)
         .text('IDENTIFICAÇÃO DO PRESCRITOR', STYLES.margins.left, y)
      
      y += 14
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.darkGray)
      
      doc.text(`Nome: ${prescription.doctor.name.toUpperCase()}`, STYLES.margins.left, y)
      y += 12
      
      const crmLine = `CRM-${prescription.doctor.crmState} ${prescription.doctor.crm}` +
        (prescription.doctor.specialty ? ` | ${prescription.doctor.specialty}` : '')
      
      doc.text(crmLine, STYLES.margins.left, y)
      y += 12
      
      doc.text(`Endereço: ${prescription.doctor.address}`, STYLES.margins.left, y)
      y += 12
      
      if (prescription.doctor.city) {
        doc.text(`Cidade: ${prescription.doctor.city}`, STYLES.margins.left, y)
        y += 12
      }
      
      if (prescription.doctor.phone) {
        doc.text(`Telefone: ${prescription.doctor.phone}`, STYLES.margins.left, y)
        y += 12
      }
      
      y += 5
      
      // ============================================
      // IDENTIFICAÇÃO DO PACIENTE (CFM obrigatório)
      // ============================================
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.heading)
         .fillColor(STYLES.colors.black)
         .text('IDENTIFICAÇÃO DO PACIENTE', STYLES.margins.left, y)
      
      y += 14
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.darkGray)
      
      doc.text(`Nome: ${prescription.patient.name}`, STYLES.margins.left, y)
      y += 12
      
      if (prescription.patient.cpf) {
        doc.text(`CPF: ${formatCPF(prescription.patient.cpf)}`, STYLES.margins.left, y)
        y += 12
      }
      
      if (prescription.patient.address) {
        doc.text(`Endereço: ${prescription.patient.address}`, STYLES.margins.left, y)
        y += 12
      }
      
      if (prescription.patient.phone) {
        doc.text(`Telefone: ${prescription.patient.phone}`, STYLES.margins.left, y)
        y += 12
      }
      
      y += 5
      
      // ============================================
      // PRESCRIÇÃO (Inscrição + Subinscrição + Adscrição)
      // ============================================
      
      doc.font(STYLES.fonts.heading)
         .fontSize(STYLES.sizes.heading)
         .fillColor(STYLES.colors.black)
         .text('PRESCRIÇÃO', STYLES.margins.left, y)
      
      y += 14
      
      // Medicamentos
      prescription.medications.forEach((med, index) => {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.black)
        
        // Número sequencial
        doc.text(`${index + 1}.`, STYLES.margins.left, y, { continued: true })
        
        // Nome do medicamento (DCB ou genérico)
        doc.text(` ${med.name}`, { continued: true })
        
        // Concentração
        if (med.concentration) {
          doc.text(` ${med.concentration}`, { continued: true })
        }
        
        // Forma farmacêutica
        if (med.pharmaceuticalForm) {
          doc.text(` - ${med.pharmaceuticalForm}`)
        } else {
          doc.text('')
        }
        
        y += 12
        
        // Quantidade
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
        
        if (config.requiresQuantityInWords && med.quantity) {
          const quantityWords = numberToWords(med.quantity)
          doc.text(`   Quantidade: ${med.quantity} (${quantityWords}) ${med.unit || 'unidades'}`, STYLES.margins.left, y)
        } else {
          doc.text(`   Quantidade: ${med.quantity || 1} ${med.unit || 'unidades'}`, STYLES.margins.left, y)
        }
        
        y += 12
        
        // Posologia (modo de usar)
        doc.text(`   Uso: ${med.dosage}`, STYLES.margins.left, y)
        y += 10
        
        if (med.frequency) {
          doc.text(`   Frequência: ${med.frequency}`, STYLES.margins.left, y)
          y += 10
        }
        
        if (med.duration) {
          doc.text(`   Duração: ${med.duration}`, STYLES.margins.left, y)
          y += 10
        }
        
        if (med.instructions) {
          doc.text(`   Instruções: ${med.instructions}`, STYLES.margins.left, y, {
            width: doc.page.width - STYLES.margins.left - STYLES.margins.right - 20,
          })
          y += 15
        }
        
        y += 5
      })
      
      y += 10
      
      // ============================================
      // JUSTIFICATIVA (obrigatória para A e B)
      // ============================================
      
      if (config.requiresJustification && options.justification) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.heading)
           .fillColor(STYLES.colors.black)
           .text('JUSTIFICATIVA', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
           .text(options.justification, STYLES.margins.left, y, {
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        
        y += 20
      }
      
      // ============================================
      // IDENTIFICAÇÃO DO COMPRADOR (controladas)
      // ============================================
      
      if (config.requiresBuyerInfo) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.heading)
           .fillColor(STYLES.colors.black)
           .text('IDENTIFICAÇÃO DO COMPRADOR', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
        
        if (options.buyerName) {
          doc.text(`Nome: ${options.buyerName}`, STYLES.margins.left, y)
          y += 12
        } else {
          doc.text('Nome: _______________________________________________', STYLES.margins.left, y)
          y += 12
        }
        
        if (options.buyerDocument) {
          doc.text(`CPF/RG: ${options.buyerDocument}`, STYLES.margins.left, y)
          y += 12
        } else {
          doc.text('CPF/RG: _____________________________________________', STYLES.margins.left, y)
          y += 12
        }
        
        if (options.buyerAddress) {
          doc.text(`Endereço: ${options.buyerAddress}`, STYLES.margins.left, y)
          y += 12
        } else {
          doc.text('Endereço: ___________________________________________', STYLES.margins.left, y)
          y += 12
        }
        
        if (options.buyerPhone) {
          doc.text(`Telefone: ${options.buyerPhone}`, STYLES.margins.left, y)
          y += 12
        } else {
          doc.text('Telefone: ___________________________________________', STYLES.margins.left, y)
          y += 12
        }
        
        y += 10
      }
      
      // ============================================
      // IDENTIFICAÇÃO DO ESTABELECIMENTO DISPENSADOR
      // ============================================
      
      if (config.requiresDispenserInfo) {
        doc.font(STYLES.fonts.heading)
           .fontSize(STYLES.sizes.heading)
           .fillColor(STYLES.colors.black)
           .text('IDENTIFICAÇÃO DO ESTABELECIMENTO DISPENSADOR', STYLES.margins.left, y)
        
        y += 14
        
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.body)
           .fillColor(STYLES.colors.darkGray)
        
        doc.text('Farmácia/Drogaria: _____________________________________', STYLES.margins.left, y)
        y += 12
        
        doc.text('CNPJ/CNES: ____________________________________________', STYLES.margins.left, y)
        y += 12
        
        doc.text('Endereço: _____________________________________________', STYLES.margins.left, y)
        y += 12
        
        doc.text('Data da Dispensação: ___________________________________', STYLES.margins.left, y)
        y += 12
        
        doc.text('Farmacêutico: _________________________________________', STYLES.margins.left, y)
        y += 12
        
        doc.text('CRF: __________________________________________________', STYLES.margins.left, y)
        y += 15
      }
      
      // ============================================
      // RODAPÉ: LOCAL, DATA, ASSINATURA
      // ============================================
      
      // Garantir espaço para rodapé
      if (y > doc.page.height - 150) {
        doc.addPage()
        y = STYLES.margins.top
      }
      
      y = doc.page.height - 120
      
      // Validade
      if (options.expiresAt) {
        doc.font(STYLES.fonts.body)
           .fontSize(STYLES.sizes.small)
           .fillColor(STYLES.colors.red)
           .text(`VALIDADE: ${formatDate(options.expiresAt)}`, STYLES.margins.left, y, {
             align: 'center',
             width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
           })
        y += 12
      }
      
      // Data e local
      const issueDate = prescription.date || new Date()
      const location = prescription.doctor.city || 'Local não especificado'
      
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.body)
         .fillColor(STYLES.colors.black)
         .text(`${location}, ${formatDate(issueDate)}`, STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 30
      
      // Linha de assinatura
      const centerX = doc.page.width / 2
      const lineWidth = 200
      
      doc.moveTo(centerX - lineWidth / 2, y)
         .lineTo(centerX + lineWidth / 2, y)
         .strokeColor(STYLES.colors.black)
         .lineWidth(1)
         .stroke()
      
      y += 8
      
      // Nome do médico e CRM
      doc.font(STYLES.fonts.body)
         .fontSize(STYLES.sizes.small)
         .fillColor(STYLES.colors.darkGray)
         .text(prescription.doctor.name.toUpperCase(), STYLES.margins.left, y, {
           align: 'center',
           width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
         })
      
      y += 10
      
      doc.text(`CRM-${prescription.doctor.crmState} ${prescription.doctor.crm}`, STYLES.margins.left, y, {
        align: 'center',
        width: doc.page.width - STYLES.margins.left - STYLES.margins.right,
      })
      
      // ============================================
      // QR CODE DE VERIFICAÇÃO (Receita Eletrônica)
      // ============================================
      
      if (prescription.verificationUrl) {
        try {
          const qrBuffer = await generateQRCode(prescription.verificationUrl)
          doc.image(qrBuffer, doc.page.width - STYLES.margins.right - 80, doc.page.height - 100, {
            width: 80,
            height: 80,
          })
          
          doc.font(STYLES.fonts.body)
             .fontSize(STYLES.sizes.tiny)
             .fillColor(STYLES.colors.gray)
             .text('Verifique a autenticidade', doc.page.width - STYLES.margins.right - 80, doc.page.height - 15, {
               width: 80,
               align: 'center',
             })
        } catch (err) {
          console.error('Erro ao gerar QR Code:', err)
        }
      }
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
