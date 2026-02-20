/**
 * Serviço de Classificação de Medicamentos e Cálculo de Validade
 * 
 * Classifica medicamentos conforme Portaria 344/98 e atualizações ANVISA
 * Calcula validade automaticamente conforme tipo de receita
 */

import { PrescriptionType } from '@prisma/client'

// ============================================
// LISTAS ANVISA (Portaria 344/98)
// ============================================

// Lista A1 - Entorpecentes (morfina, heroína, etc)
const LISTA_A1_KEYWORDS = [
  'morfina', 'codeína', 'fentanil', 'metadona', 'oxicodona',
  'hidromorfona', 'petidina', 'meperidina', 'sufentanil',
  'remifentanil', 'alfentanil', 'tapentadol'
]

// Lista A2 - Entorpecentes de uso permitido em concentrações especiais
const LISTA_A2_KEYWORDS = [
  'anfetamina', 'dexanfetamina', 'femproporex', 'mazindol',
  'metilfenidato', 'lisdexanfetamina'
]

// Lista B1 - Psicotrópicos (ansiolíticos, sedativos)
const LISTA_B1_KEYWORDS = [
  'alprazolam', 'bromazepam', 'clonazepam', 'clordiazepóxido',
  'diazepam', 'lorazepam', 'midazolam', 'nitrazepam',
  'zolpidem', 'zopiclona', 'fenobarbital', 'eszopiclona'
]

// Lista B2 - Psicotrópicos anorexígenos
const LISTA_B2_KEYWORDS = [
  'femproporex', 'anfepramona', 'sibutramina'
]

// Lista C1 - Outras substâncias sujeitas a controle especial
const LISTA_C1_KEYWORDS = [
  'imipramina', 'clomipramina', 'amitriptilina', 'nortriptilina',
  'bupropiona', 'trazodona', 'venlafaxina', 'duloxetina',
  'fluoxetina', 'paroxetina', 'sertralina', 'escitalopram',
  'citalopram', 'fluvoxamina', 'pregabalina', 'gabapentina'
]

// Lista C4 - Antiretrovirais
const LISTA_C4_KEYWORDS = [
  'zidovudina', 'lamivudina', 'tenofovir', 'emtricitabina',
  'efavirenz', 'nevirapina', 'atazanavir', 'darunavir',
  'lopinavir', 'ritonavir', 'raltegravir', 'dolutegravir'
]

// Lista C5 - Anabolizantes
const LISTA_C5_KEYWORDS = [
  'testosterona', 'nandrolona', 'estanozolol', 'oxandrolona',
  'metenolona', 'trembolona', 'boldenona', 'metandrostenolona'
]

// Antibióticos (antimicrobianos)
const ANTIBIOTICS_KEYWORDS = [
  // Penicilinas
  'amoxicilina', 'ampicilina', 'penicilina', 'oxacilina',
  // Cefalosporinas
  'cefalexina', 'cefaclor', 'cefuroxima', 'ceftriaxona', 'cefepima',
  // Macrolídeos
  'azitromicina', 'claritromicina', 'eritromicina',
  // Quinolonas
  'ciprofloxacino', 'levofloxacino', 'norfloxacino', 'moxifloxacino',
  // Outros
  'doxiciclina', 'tetraciclina', 'sulfametoxazol', 'trimetoprima',
  'metronidazol', 'vancomicina', 'gentamicina', 'amicacina',
  'clindamicina', 'linezolida', 'nitrofurantoína'
]

// ============================================
// FUNÇÕES DE CLASSIFICAÇÃO
// ============================================

/**
 * Classifica um medicamento pelo nome e retorna o tipo de receita necessário
 */
export function classifyMedication(medicationName: string): PrescriptionType {
  const lowerName = medicationName.toLowerCase()
  
  // Lista A (Entorpecentes) - Amarela
  if (LISTA_A1_KEYWORDS.some(keyword => lowerName.includes(keyword)) ||
      LISTA_A2_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'CONTROLLED_A'
  }
  
  // Lista B (Psicotrópicos) - Azul
  if (LISTA_B1_KEYWORDS.some(keyword => lowerName.includes(keyword)) ||
      LISTA_B2_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'CONTROLLED_B'
  }
  
  // Lista C4 (Antiretrovirais)
  if (LISTA_C4_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'CONTROLLED_C4'
  }
  
  // Lista C5 (Anabolizantes)
  if (LISTA_C5_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'CONTROLLED_C5'
  }
  
  // Lista C1 (Outras controladas)
  if (LISTA_C1_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'CONTROLLED_C1'
  }
  
  // Antibióticos (Antimicrobianos)
  if (ANTIBIOTICS_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'ANTIMICROBIAL'
  }
  
  // Padrão: receita simples
  return 'SIMPLE'
}

/**
 * Classifica múltiplos medicamentos e retorna o tipo de receita mais restritivo
 */
export function classifyPrescriptionType(medications: string[]): PrescriptionType {
  const types = medications.map(med => classifyMedication(med))
  
  // Ordem de prioridade (mais restritivo primeiro)
  const priority: PrescriptionType[] = [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_C5',
    'CONTROLLED_C4',
    'CONTROLLED_C1',
    'ANTIMICROBIAL',
    'SIMPLE',
  ]
  
  for (const type of priority) {
    if (types.includes(type)) {
      return type
    }
  }
  
  return 'SIMPLE'
}

/**
 * Calcula a data de validade da receita conforme o tipo
 */
export function calculateExpirationDate(
  prescriptionType: PrescriptionType,
  issueDate: Date = new Date()
): Date {
  const expirationDate = new Date(issueDate)
  
  switch (prescriptionType) {
    case 'ANTIMICROBIAL':
      // Antibióticos: 10 dias
      expirationDate.setDate(expirationDate.getDate() + 10)
      break
    
    case 'CONTROLLED_C4':
      // Antiretrovirais: 6 meses
      expirationDate.setMonth(expirationDate.getMonth() + 6)
      break
    
    case 'CONTROLLED_A':
    case 'CONTROLLED_B':
    case 'CONTROLLED_C1':
    case 'CONTROLLED_C5':
      // Receitas controladas: 30 dias
      expirationDate.setDate(expirationDate.getDate() + 30)
      break
    
    case 'SIMPLE':
    default:
      // Receita simples: 30 dias (recomendado, não obrigatório)
      expirationDate.setDate(expirationDate.getDate() + 30)
      break
  }
  
  return expirationDate
}

/**
 * Verifica se o medicamento requer quantidade por extenso
 */
export function requiresQuantityInWords(prescriptionType: PrescriptionType): boolean {
  return [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_C1',
    'CONTROLLED_C4',
    'CONTROLLED_C5',
  ].includes(prescriptionType)
}

/**
 * Verifica se o medicamento requer duas vias
 */
export function requiresTwoVias(prescriptionType: PrescriptionType): boolean {
  return prescriptionType !== 'SIMPLE'
}

/**
 * Verifica se o medicamento requer número de controle
 */
export function requiresControlNumber(prescriptionType: PrescriptionType): boolean {
  return [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_C1',
    'CONTROLLED_C4',
    'CONTROLLED_C5',
  ].includes(prescriptionType)
}

/**
 * Verifica se o medicamento requer justificativa
 */
export function requiresJustification(prescriptionType: PrescriptionType): boolean {
  return [
    'CONTROLLED_A',
    'CONTROLLED_B',
  ].includes(prescriptionType)
}

/**
 * Verifica se o medicamento requer identificação do comprador
 */
export function requiresBuyerInfo(prescriptionType: PrescriptionType): boolean {
  return [
    'CONTROLLED_A',
    'CONTROLLED_B',
    'CONTROLLED_C1',
    'CONTROLLED_C4',
    'CONTROLLED_C5',
  ].includes(prescriptionType)
}

/**
 * Retorna o limite máximo de ampolas (se aplicável)
 */
export function getMaxAmpoules(prescriptionType: PrescriptionType): number | null {
  if (prescriptionType === 'CONTROLLED_A') {
    return 5 // Lista A: máximo 5 ampolas por receita
  }
  return null
}

/**
 * Retorna a cor da receita (para indicação visual)
 */
export function getPrescriptionColor(prescriptionType: PrescriptionType): string {
  switch (prescriptionType) {
    case 'CONTROLLED_A':
      return '#FEF3C7' // Amarelo claro
    case 'CONTROLLED_B':
      return '#DBEAFE' // Azul claro
    default:
      return '#FFFFFF' // Branco
  }
}

/**
 * Retorna o título da receita
 */
export function getPrescriptionTitle(prescriptionType: PrescriptionType): string {
  switch (prescriptionType) {
    case 'SIMPLE':
      return 'RECEITUÁRIO MÉDICO'
    case 'ANTIMICROBIAL':
      return 'RECEITUÁRIO MÉDICO - ANTIMICROBIANO'
    case 'CONTROLLED_A':
      return 'NOTIFICAÇÃO DE RECEITA A (AMARELA)'
    case 'CONTROLLED_B':
      return 'NOTIFICAÇÃO DE RECEITA B (AZUL)'
    case 'CONTROLLED_C1':
      return 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C1'
    case 'CONTROLLED_C4':
      return 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C4 (ANTIRETROVIRAIS)'
    case 'CONTROLLED_C5':
      return 'RECEITUÁRIO DE CONTROLE ESPECIAL - LISTA C5 (ANABOLIZANTES)'
    default:
      return 'RECEITUÁRIO MÉDICO'
  }
}

/**
 * Valida se a prescrição está conforme CFM/ANVISA
 */
export interface PrescriptionValidationError {
  field: string
  message: string
}

export function validatePrescription(prescription: {
  prescriptionType: PrescriptionType
  medications: Array<{
    name: string
    quantity: number
    pharmaceuticalForm?: string
  }>
  controlNumber?: string
  justification?: string
  buyerName?: string
  buyerDocument?: string
}): PrescriptionValidationError[] {
  const errors: PrescriptionValidationError[] = []
  
  // Validar número de controle
  if (requiresControlNumber(prescription.prescriptionType) && !prescription.controlNumber) {
    errors.push({
      field: 'controlNumber',
      message: `Receita ${prescription.prescriptionType} requer número de controle da Vigilância Sanitária`,
    })
  }
  
  // Validar justificativa
  if (requiresJustification(prescription.prescriptionType) && !prescription.justification) {
    errors.push({
      field: 'justification',
      message: `Receita ${prescription.prescriptionType} requer justificativa médica`,
    })
  }
  
  // Validar identificação do comprador
  if (requiresBuyerInfo(prescription.prescriptionType)) {
    if (!prescription.buyerName) {
      errors.push({
        field: 'buyerName',
        message: `Receita ${prescription.prescriptionType} requer nome do comprador`,
      })
    }
    if (!prescription.buyerDocument) {
      errors.push({
        field: 'buyerDocument',
        message: `Receita ${prescription.prescriptionType} requer CPF/RG do comprador`,
      })
    }
  }
  
  // Validar limite de ampolas (Lista A)
  const maxAmpoules = getMaxAmpoules(prescription.prescriptionType)
  if (maxAmpoules) {
    const ampoules = prescription.medications.filter(med => 
      med.pharmaceuticalForm?.toLowerCase().includes('ampola')
    )
    const totalAmpoules = ampoules.reduce((sum, med) => sum + med.quantity, 0)
    
    if (totalAmpoules > maxAmpoules) {
      errors.push({
        field: 'medications',
        message: `Receita A permite no máximo ${maxAmpoules} ampolas por receita. Total: ${totalAmpoules}`,
      })
    }
  }
  
  return errors
}
