/**
 * Serviço de Receituário Especial - Medicamentos Controlados
 * 
 * Implementa as normas da ANVISA:
 * - Portaria SVS/MS 344/98 - Regulamento para substâncias controladas
 * - RDC 20/2011 - Dispensação de antimicrobianos
 * - SNGPC - Sistema Nacional de Gerenciamento de Produtos Controlados
 * 
 * Tipos de Receituário:
 * - Receita Simples: medicamentos isentos de controle especial
 * - Receita Branca (duas vias): Lista C1, C2, C4, C5
 * - Receita Azul (Notificação B): Lista B1, B2
 * - Receita Amarela (Notificação A): Lista A1, A2, A3, entorpecentes
 * - Receita de Antimicrobianos: RDC 20/2011 (duas vias, validade 10 dias)
 */

import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============ TIPOS ============

export type PrescriptionControlType = 
  | 'SIMPLE'           // Receita simples (sem controle especial)
  | 'WHITE_C'          // Receita branca controlada (C1, C2, C4, C5)
  | 'BLUE_B'           // Notificação de Receita B (azul)
  | 'YELLOW_A'         // Notificação de Receita A (amarela)
  | 'ANTIMICROBIAL'    // Receita de antimicrobianos

export type ControlledList = 
  | 'A1' | 'A2' | 'A3'           // Entorpecentes - Notificação A (amarela)
  | 'B1' | 'B2'                  // Psicotrópicos - Notificação B (azul)
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5'  // Outras substâncias - Receita branca
  | 'D1' | 'D2'                  // Precursores
  | 'E'                          // Plantas
  | 'F'                          // Proibidas
  | 'ANTIMICROBIAL'              // Antimicrobianos (RDC 20)
  | 'NONE'                       // Sem controle

export interface ControlledMedicationInfo {
  name: string
  list: ControlledList
  prescriptionType: PrescriptionControlType
  validityDays: number
  maxQuantityDays: number
  requiresNotification: boolean
  copies: number
  paperColor: 'WHITE' | 'BLUE' | 'YELLOW'
  specialInstructions: string[]
}

export interface ControlledPrescriptionData {
  patient: {
    name: string
    cpf?: string
    address: string
    birthDate: Date
    phone?: string
  }
  prescriber: {
    name: string
    crm: string
    crmState: string
    specialty?: string
    address: string
    phone?: string
  }
  establishment: {
    name: string
    cnes?: string
    address: string
    phone?: string
  }
  medications: Array<{
    name: string
    concentration?: string
    form?: string
    quantity: number
    quantityText: string // Por extenso
    dosage: string
    instructions?: string
    list: ControlledList
  }>
  prescriptionDate: Date
  notificationNumber?: string // Número da notificação SNGPC
  issuedAt: string // Cidade
}

export interface GeneratedPrescription {
  type: PrescriptionControlType
  paperColor: 'WHITE' | 'BLUE' | 'YELLOW'
  copies: number
  validityDays: number
  html: string
  notificationNumber?: string
}

// ============ BASE DE CONHECIMENTO ============

// Mapeamento de substâncias para listas de controle (exemplos comuns)
const CONTROLLED_SUBSTANCES: Record<string, ControlledList> = {
  // Lista A1 - Entorpecentes (Amarela)
  'morfina': 'A1',
  'codeina': 'A1',
  'metadona': 'A1',
  'fentanil': 'A1',
  'oxicodona': 'A1',
  'hidrocodona': 'A1',
  'petidina': 'A1',
  'meperidina': 'A1',
  
  // Lista A2 - Entorpecentes para concentrações especiais
  'codeína': 'A2',
  
  // Lista A3 - Psicotrópicos entorpecentes
  'anfetamina': 'A3',
  'metilfenidato': 'A3',
  'ritalina': 'A3',
  'concerta': 'A3',
  'venvanse': 'A3',
  'lisdexanfetamina': 'A3',
  
  // Lista B1 - Psicotrópicos (Azul)
  'diazepam': 'B1',
  'clonazepam': 'B1',
  'alprazolam': 'B1',
  'lorazepam': 'B1',
  'bromazepam': 'B1',
  'midazolam': 'B1',
  'zolpidem': 'B1',
  'cloxazolam': 'B1',
  'clobazam': 'B1',
  'nitrazepam': 'B1',
  'flunitrazepam': 'B1',
  'triazolam': 'B1',
  'fenobarbital': 'B1',
  'rivotril': 'B1',
  'frontal': 'B1',
  'lexotan': 'B1',
  'lorax': 'B1',
  
  // Lista B2 - Psicotrópicos anorexígenos
  'sibutramina': 'B2',
  'anfepramona': 'B2',
  'femproporex': 'B2',
  'mazindol': 'B2',
  
  // Lista C1 - Controle especial (Branca 2 vias)
  'gabapentina': 'C1',
  'pregabalina': 'C1',
  'lyrica': 'C1',
  'topiramato': 'C1',
  'lamotrigina': 'C1',
  'carbamazepina': 'C1',
  'oxcarbazepina': 'C1',
  'valproato': 'C1',
  'ácido valproico': 'C1',
  'levetiracetam': 'C1',
  'quetiapina': 'C1',
  'seroquel': 'C1',
  'olanzapina': 'C1',
  'risperidona': 'C1',
  'haloperidol': 'C1',
  'clorpromazina': 'C1',
  'trazodona': 'C1',
  'mirtazapina': 'C1',
  'venlafaxina': 'C1',
  'desvenlafaxina': 'C1',
  'duloxetina': 'C1',
  'bupropiona': 'C1',
  
  // Lista C2 - Retinóides
  'isotretinoína': 'C2',
  'roacutan': 'C2',
  'acitretina': 'C2',
  'tretinoína': 'C2',
  
  // Lista C4 - Anti-retrovirais
  'efavirenz': 'C4',
  'tenofovir': 'C4',
  'lamivudina': 'C4',
  'zidovudina': 'C4',
  
  // Lista C5 - Anabolizantes
  'testosterona': 'C5',
  'nandrolona': 'C5',
  'oxandrolona': 'C5',
  'stanozolol': 'C5',
  'durateston': 'C5',
  
  // Antimicrobianos (RDC 20/2011)
  'amoxicilina': 'ANTIMICROBIAL',
  'azitromicina': 'ANTIMICROBIAL',
  'ciprofloxacino': 'ANTIMICROBIAL',
  'levofloxacino': 'ANTIMICROBIAL',
  'cefalexina': 'ANTIMICROBIAL',
  'ceftriaxona': 'ANTIMICROBIAL',
  'metronidazol': 'ANTIMICROBIAL',
  'sulfametoxazol': 'ANTIMICROBIAL',
  'trimetoprim': 'ANTIMICROBIAL',
  'doxiciclina': 'ANTIMICROBIAL',
  'claritromicina': 'ANTIMICROBIAL',
  'penicilina': 'ANTIMICROBIAL',
  'ampicilina': 'ANTIMICROBIAL',
  'norfloxacino': 'ANTIMICROBIAL',
  'nitrofurantoína': 'ANTIMICROBIAL',
  'fluconazol': 'ANTIMICROBIAL',
  'itraconazol': 'ANTIMICROBIAL',
}

// Configuração por tipo de lista
const LIST_CONFIG: Record<ControlledList, {
  prescriptionType: PrescriptionControlType
  validityDays: number
  maxQuantityDays: number
  copies: number
  paperColor: 'WHITE' | 'BLUE' | 'YELLOW'
  instructions: string[]
}> = {
  'A1': {
    prescriptionType: 'YELLOW_A',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 3,
    paperColor: 'YELLOW',
    instructions: [
      'Notificação de Receita A (amarela) obrigatória',
      'Retenção da 1ª via pela farmácia',
      '2ª via devolvida ao paciente com carimbo',
      'Quantidade máxima para 30 dias de tratamento',
      'Válida apenas no estado de emissão'
    ]
  },
  'A2': {
    prescriptionType: 'YELLOW_A',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 3,
    paperColor: 'YELLOW',
    instructions: [
      'Notificação de Receita A (amarela) obrigatória',
      'Para concentrações/formas especiais'
    ]
  },
  'A3': {
    prescriptionType: 'YELLOW_A',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 3,
    paperColor: 'YELLOW',
    instructions: [
      'Notificação de Receita A (amarela) obrigatória',
      'Psicotrópico de uso controlado'
    ]
  },
  'B1': {
    prescriptionType: 'BLUE_B',
    validityDays: 30,
    maxQuantityDays: 60,
    copies: 2,
    paperColor: 'BLUE',
    instructions: [
      'Notificação de Receita B (azul) obrigatória',
      'Retenção da notificação pela farmácia',
      'Quantidade máxima para 60 dias de tratamento',
      'Válida em todo território nacional'
    ]
  },
  'B2': {
    prescriptionType: 'BLUE_B',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 2,
    paperColor: 'BLUE',
    instructions: [
      'Notificação de Receita B (azul) obrigatória',
      'Psicotrópico anorexígeno',
      'Quantidade máxima para 30 dias'
    ]
  },
  'C1': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 60,
    copies: 2,
    paperColor: 'WHITE',
    instructions: [
      'Receita de Controle Especial em 2 vias',
      'Retenção da 2ª via pela farmácia',
      'Válida por 30 dias'
    ]
  },
  'C2': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 2,
    paperColor: 'WHITE',
    instructions: [
      'Receita de Controle Especial em 2 vias',
      'Retinóide sistêmico',
      'Exige Termo de Consentimento para mulheres em idade fértil'
    ]
  },
  'C3': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 60,
    copies: 2,
    paperColor: 'WHITE',
    instructions: ['Imunossupressores']
  },
  'C4': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 60,
    copies: 2,
    paperColor: 'WHITE',
    instructions: ['Anti-retrovirais', 'Dispensação exclusiva pelo SUS']
  },
  'C5': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 60,
    copies: 2,
    paperColor: 'WHITE',
    instructions: [
      'Anabolizantes',
      'Receita de Controle Especial em 2 vias',
      'Necessário justificativa clínica'
    ]
  },
  'D1': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 2,
    paperColor: 'WHITE',
    instructions: ['Precursor de entorpecentes']
  },
  'D2': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 2,
    paperColor: 'WHITE',
    instructions: ['Precursor de psicotrópicos']
  },
  'E': {
    prescriptionType: 'WHITE_C',
    validityDays: 30,
    maxQuantityDays: 30,
    copies: 2,
    paperColor: 'WHITE',
    instructions: ['Plantas proscritas']
  },
  'F': {
    prescriptionType: 'WHITE_C',
    validityDays: 0,
    maxQuantityDays: 0,
    copies: 0,
    paperColor: 'WHITE',
    instructions: ['SUBSTÂNCIA PROIBIDA - NÃO PODE SER PRESCRITA']
  },
  'ANTIMICROBIAL': {
    prescriptionType: 'ANTIMICROBIAL',
    validityDays: 10,
    maxQuantityDays: 90,
    copies: 2,
    paperColor: 'WHITE',
    instructions: [
      'Receita de antimicrobiano em 2 vias',
      'Válida por 10 dias',
      'Retenção da 2ª via pela farmácia',
      'RDC ANVISA 20/2011'
    ]
  },
  'NONE': {
    prescriptionType: 'SIMPLE',
    validityDays: 90,
    maxQuantityDays: 180,
    copies: 1,
    paperColor: 'WHITE',
    instructions: ['Receita simples']
  }
}

// ============ SERVIÇO ============

class ControlledPrescriptionServiceClass {
  /**
   * Identifica a lista de controle de um medicamento
   */
  getMedicationControlList(medicationName: string): ControlledList {
    const nameLower = medicationName.toLowerCase()
    
    // Verificar na base de conhecimento
    for (const [substance, list] of Object.entries(CONTROLLED_SUBSTANCES)) {
      if (nameLower.includes(substance.toLowerCase())) {
        return list
      }
    }

    return 'NONE'
  }

  /**
   * Retorna informações sobre um medicamento controlado
   */
  getControlledMedicationInfo(medicationName: string): ControlledMedicationInfo {
    const list = this.getMedicationControlList(medicationName)
    const config = LIST_CONFIG[list]

    return {
      name: medicationName,
      list,
      prescriptionType: config.prescriptionType,
      validityDays: config.validityDays,
      maxQuantityDays: config.maxQuantityDays,
      requiresNotification: list.startsWith('A') || list.startsWith('B'),
      copies: config.copies,
      paperColor: config.paperColor,
      specialInstructions: config.instructions
    }
  }

  /**
   * Determina o tipo de receituário necessário para uma lista de medicamentos
   */
  determinePrescriptionType(medications: Array<{ name: string }>): PrescriptionControlType {
    let maxControlLevel: PrescriptionControlType = 'SIMPLE'
    const priority: PrescriptionControlType[] = [
      'SIMPLE', 'ANTIMICROBIAL', 'WHITE_C', 'BLUE_B', 'YELLOW_A'
    ]

    for (const med of medications) {
      const info = this.getControlledMedicationInfo(med.name)
      const currentIndex = priority.indexOf(info.prescriptionType)
      const maxIndex = priority.indexOf(maxControlLevel)
      
      if (currentIndex > maxIndex) {
        maxControlLevel = info.prescriptionType
      }
    }

    return maxControlLevel
  }

  /**
   * Valida se a prescrição está conforme as normas
   */
  validatePrescription(data: ControlledPrescriptionData): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Verificar dados obrigatórios do paciente
    if (!data.patient.name) errors.push('Nome do paciente é obrigatório')
    if (!data.patient.address) errors.push('Endereço do paciente é obrigatório')

    // Verificar dados do prescritor
    if (!data.prescriber.crm) errors.push('CRM do prescritor é obrigatório')
    if (!data.prescriber.crmState) errors.push('Estado do CRM é obrigatório')

    // Verificar medicamentos
    for (const med of data.medications) {
      const info = this.getControlledMedicationInfo(med.name)
      
      // Lista F - Proibidas
      if (info.list === 'F') {
        errors.push(`${med.name}: Substância PROIBIDA, não pode ser prescrita`)
        continue
      }

      // Verificar quantidade
      if (!med.quantity || med.quantity <= 0) {
        errors.push(`${med.name}: Quantidade deve ser especificada`)
      }

      // Verificar quantidade por extenso para controlados
      if (info.list !== 'NONE' && !med.quantityText) {
        errors.push(`${med.name}: Quantidade por extenso é obrigatória para controlados`)
      }

      // Avisos sobre limitações
      if (info.list === 'A1' || info.list === 'A2' || info.list === 'A3') {
        warnings.push(`${med.name}: Notificação Amarela obrigatória, válida apenas no estado de emissão`)
      }

      if (info.list === 'B2') {
        warnings.push(`${med.name}: Anorexígeno - verificar contraindicações cardiovasculares`)
      }

      if (info.list === 'C2') {
        warnings.push(`${med.name}: Retinóide - verificar gravidez/contracepção`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Gera número de notificação (formato SNGPC)
   */
  generateNotificationNumber(type: PrescriptionControlType): string {
    const now = new Date()
    const year = now.getFullYear()
    const sequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
    
    // Prefixo por tipo
    const prefix = type === 'YELLOW_A' ? 'A' : type === 'BLUE_B' ? 'B' : 'C'
    
    return `${prefix}${year}${sequence}`
  }

  /**
   * Gera o HTML do receituário
   */
  generatePrescriptionHTML(data: ControlledPrescriptionData): GeneratedPrescription {
    const type = this.determinePrescriptionType(data.medications)
    const config = LIST_CONFIG[data.medications[0] ? this.getMedicationControlList(data.medications[0].name) : 'NONE']
    const notificationNumber = config.prescriptionType !== 'SIMPLE' 
      ? this.generateNotificationNumber(type) 
      : undefined

    const html = this.buildHTML(data, type, config, notificationNumber)

    return {
      type,
      paperColor: config.paperColor,
      copies: config.copies,
      validityDays: config.validityDays,
      html,
      notificationNumber
    }
  }

  /**
   * Constrói o HTML do receituário
   */
  private buildHTML(
    data: ControlledPrescriptionData,
    type: PrescriptionControlType,
    config: (typeof LIST_CONFIG)['NONE'],
    notificationNumber?: string
  ): string {
    const formattedDate = format(data.prescriptionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    
    // Cor de fundo baseada no tipo
    const bgColor = config.paperColor === 'YELLOW' ? '#FFFDE7' 
      : config.paperColor === 'BLUE' ? '#E3F2FD' 
      : '#FFFFFF'

    // Título do receituário
    const title = type === 'YELLOW_A' ? 'NOTIFICAÇÃO DE RECEITA "A"'
      : type === 'BLUE_B' ? 'NOTIFICAÇÃO DE RECEITA "B"'
      : type === 'WHITE_C' ? 'RECEITA DE CONTROLE ESPECIAL'
      : type === 'ANTIMICROBIAL' ? 'RECEITA DE ANTIMICROBIANO'
      : 'RECEITA MÉDICA'

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 10mm;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      background-color: ${bgColor};
      margin: 0;
      padding: 15px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 10pt;
      color: #666;
    }
    .notification-number {
      font-size: 16pt;
      font-weight: bold;
      color: ${config.paperColor === 'YELLOW' ? '#B8860B' : config.paperColor === 'BLUE' ? '#1565C0' : '#333'};
      margin: 10px 0;
    }
    .prescriber-info {
      margin-bottom: 15px;
      font-size: 10pt;
    }
    .patient-info {
      background: rgba(0,0,0,0.05);
      padding: 10px;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    .patient-info p {
      margin: 3px 0;
    }
    .medications {
      margin: 20px 0;
    }
    .medication-item {
      margin-bottom: 15px;
      padding: 10px;
      border-left: 3px solid ${config.paperColor === 'YELLOW' ? '#FFC107' : config.paperColor === 'BLUE' ? '#2196F3' : '#333'};
      background: rgba(255,255,255,0.5);
    }
    .medication-name {
      font-weight: bold;
      font-size: 12pt;
    }
    .medication-qty {
      font-style: italic;
    }
    .medication-dosage {
      margin-top: 5px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 250px;
      margin: 30px auto 5px;
      padding-top: 5px;
    }
    .date-location {
      margin-top: 20px;
      text-align: right;
      font-style: italic;
    }
    .copy-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 9pt;
      color: #999;
    }
    .instructions {
      font-size: 9pt;
      color: #666;
      margin-top: 20px;
      padding: 10px;
      border: 1px dashed #999;
    }
    .validity {
      font-weight: bold;
      color: ${config.paperColor === 'YELLOW' ? '#B8860B' : '#C62828'};
    }
  </style>
</head>
<body>
  <div class="copy-indicator">1ª VIA - FARMÁCIA</div>
  
  <div class="header">
    <div class="title">${title}</div>
    ${notificationNumber ? `<div class="notification-number">Nº ${notificationNumber}</div>` : ''}
    <div class="subtitle">${data.establishment.name}</div>
    <div class="subtitle">${data.establishment.address}</div>
    ${data.establishment.cnes ? `<div class="subtitle">CNES: ${data.establishment.cnes}</div>` : ''}
  </div>

  <div class="prescriber-info">
    <strong>Prescritor:</strong> ${data.prescriber.name}<br>
    <strong>CRM:</strong> ${data.prescriber.crm}/${data.prescriber.crmState}
    ${data.prescriber.specialty ? ` - ${data.prescriber.specialty}` : ''}
  </div>

  <div class="patient-info">
    <p><strong>Paciente:</strong> ${data.patient.name}</p>
    ${data.patient.cpf ? `<p><strong>CPF:</strong> ${this.formatCPF(data.patient.cpf)}</p>` : ''}
    <p><strong>Endereço:</strong> ${data.patient.address}</p>
    <p><strong>Data de Nascimento:</strong> ${format(data.patient.birthDate, 'dd/MM/yyyy')}</p>
  </div>

  <div class="medications">
    ${data.medications.map((med, index) => `
      <div class="medication-item">
        <div class="medication-name">${index + 1}. ${med.name} ${med.concentration || ''} ${med.form || ''}</div>
        <div class="medication-qty">Quantidade: ${med.quantity} (${med.quantityText})</div>
        <div class="medication-dosage">${med.dosage}</div>
        ${med.instructions ? `<div class="medication-instructions">${med.instructions}</div>` : ''}
      </div>
    `).join('')}
  </div>

  <div class="date-location">
    ${data.issuedAt}, ${formattedDate}
  </div>

  <div class="footer">
    <div class="signature-line">
      ${data.prescriber.name}<br>
      CRM ${data.prescriber.crm}/${data.prescriber.crmState}
    </div>
  </div>

  <div class="instructions">
    <p class="validity">Válida por ${config.validityDays} dias a partir da data de emissão.</p>
    ${config.instructions.map(i => `<p>• ${i}</p>`).join('')}
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Formata CPF
   */
  private formatCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, '')
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  /**
   * Converte número para extenso
   */
  numberToWords(num: number): string {
    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

    if (num === 0) return 'zero'
    if (num === 100) return 'cem'

    let result = ''

    // Centenas
    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)]
      num %= 100
      if (num > 0) result += ' e '
    }

    // Dezenas e unidades
    if (num >= 20) {
      result += tens[Math.floor(num / 10)]
      num %= 10
      if (num > 0) result += ' e '
    } else if (num >= 10) {
      result += teens[num - 10]
      num = 0
    }

    if (num > 0) {
      result += units[num]
    }

    return result
  }
}

// Singleton
export const ControlledPrescriptionService = new ControlledPrescriptionServiceClass()
