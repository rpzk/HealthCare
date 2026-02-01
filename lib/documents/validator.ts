/**
 * Validador de Documentos Médicos
 * Conformidade: CFM 2.299/2021, Portaria 344/98, Lei 9.787/99
 */

import {
  DoctorInfo,
  PatientInfo,
  MedicationItem,
  PrescriptionDocument,
  MedicalCertificateDocument,
  ReferralDocument,
  ExamRequestDocument,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ControlledPrescriptionType,
} from './types'

// ============================================
// LISTAS DE MEDICAMENTOS CONTROLADOS (PORTARIA 344/98)
// ============================================

// Lista A1 - Entorpecentes
const LISTA_A1 = [
  'alfentanila', 'cocaína', 'codeína', 'fentanila', 'heroína',
  'hidrocodona', 'hidromorfona', 'metadona', 'morfina', 'ópio',
  'oxicodona', 'petidina', 'remifentanila', 'sufentanila', 'tapentadol',
]

// Lista A2 - Entorpecentes (uso permitido apenas como padrão de referência)
const LISTA_A2 = [
  'acetildiidrocodeína', 'acetorfina', 'benzoilecgonina',
]

// Lista A3 - Psicotrópicos
const LISTA_A3 = [
  'anfetamina', 'femproporex', 'mazindol', 'metilfenidato',
  'lisdexanfetamina', 'anfepramona',
]

// Lista B1 - Psicotrópicos
const LISTA_B1 = [
  'alprazolam', 'bromazepam', 'brotizolam', 'camazepam', 'cetazolam',
  'clobazam', 'clonazepam', 'clorazepato', 'clotiazepam', 'cloxazolam',
  'delorazepam', 'diazepam', 'estazolam', 'etizolam', 'fenobarbital',
  'flunitrazepam', 'flurazepam', 'halazepam', 'haloxazolam', 'loflazepato',
  'loprazolam', 'lorazepam', 'lormetazepam', 'medazepam', 'midazolam',
  'nimetazepam', 'nitrazepam', 'nordazepam', 'oxazepam', 'oxazolam',
  'pinazepam', 'prazepam', 'quazepam', 'temazepam', 'tetrazepam',
  'triazolam', 'zolpidem', 'zopiclona', 'eszopiclona',
]

// Lista B2 - Psicotrópicos anorexígenos
const LISTA_B2 = [
  'aminorex', 'anfepramona', 'femproporex', 'fendimetrazina',
  'fentermina', 'mazindol', 'mefenorex', 'sibutramina',
]

// Lista C1 - Outras substâncias
const LISTA_C1 = [
  'acepromazina', 'ácido valpróico', 'amantadina', 'amitriptilina',
  'biperideno', 'bupropiona', 'carbamazepina', 'carbonato de lítio',
  'citalopram', 'clomipramina', 'clozapina', 'desvenlafaxina',
  'duloxetina', 'escitalopram', 'fenitoína', 'fluoxetina',
  'fluvoxamina', 'gabapentina', 'haloperidol', 'imipramina',
  'lamotrigina', 'levetiracetam', 'mirtazapina', 'nortriptilina',
  'olanzapina', 'oxcarbazepina', 'paroxetina', 'pregabalina',
  'primidona', 'quetiapina', 'risperidona', 'sertralina',
  'topiramato', 'tramadol', 'trazodona', 'valproato de sódio',
  'venlafaxina', 'vigabatrina', 'ziprasidona',
]

// Antimicrobianos (RDC 20/2011)
const ANTIMICROBIANOS = [
  'amicacina', 'amoxicilina', 'ampicilina', 'azitromicina',
  'aztreonam', 'benzilpenicilina', 'carbenicilina', 'cefalexina',
  'cefalotina', 'cefazolina', 'cefepima', 'cefotaxima', 'cefoxitina',
  'ceftazidima', 'ceftriaxona', 'cefuroxima', 'ciprofloxacino',
  'claritromicina', 'clindamicina', 'cloranfenicol', 'daptomicina',
  'doxiciclina', 'eritromicina', 'ertapenem', 'estreptomicina',
  'fosfomicina', 'gentamicina', 'imipenem', 'levofloxacino',
  'lincomicina', 'linezolida', 'meropenem', 'metronidazol',
  'minociclina', 'moxifloxacino', 'neomicina', 'nitrofurantoína',
  'norfloxacino', 'ofloxacino', 'oxacilina', 'penicilina',
  'piperacilina', 'polimixina', 'rifampicina', 'sulfadiazina',
  'sulfametoxazol', 'teicoplanina', 'tetraciclina', 'tigeciclina',
  'tobramicina', 'trimetoprima', 'vancomicina',
]

/**
 * Verifica se um medicamento é controlado e retorna sua classificação
 */
export function classifyMedication(name: string): {
  isControlled: boolean
  controlledType?: ControlledPrescriptionType
  isAntimicrobial: boolean
  notificationType?: 'A' | 'B' | 'SPECIAL'
} {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // Verificar listas de controlados
  if (LISTA_A1.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'A1', isAntimicrobial: false, notificationType: 'A' }
  }
  if (LISTA_A2.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'A2', isAntimicrobial: false, notificationType: 'A' }
  }
  if (LISTA_A3.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'A3', isAntimicrobial: false, notificationType: 'A' }
  }
  if (LISTA_B1.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'B1', isAntimicrobial: false, notificationType: 'B' }
  }
  if (LISTA_B2.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'B2', isAntimicrobial: false, notificationType: 'B' }
  }
  if (LISTA_C1.some(m => normalized.includes(m))) {
    return { isControlled: true, controlledType: 'C1', isAntimicrobial: false, notificationType: 'SPECIAL' }
  }
  
  // Verificar antimicrobianos
  if (ANTIMICROBIANOS.some(m => normalized.includes(m))) {
    return { isControlled: false, isAntimicrobial: true, controlledType: 'ANTIMICROBIAL' }
  }
  
  return { isControlled: false, isAntimicrobial: false }
}

/**
 * Valida informações do médico (CFM 2.299/2021 Art. 2º)
 */
export function validateDoctor(doctor: DoctorInfo): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Nome obrigatório
  if (!doctor.name || doctor.name.trim().length < 3) {
    errors.push({
      code: 'DOCTOR_NAME_REQUIRED',
      field: 'doctor.name',
      message: 'Nome do médico é obrigatório (mínimo 3 caracteres)',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "a"',
    })
  }
  
  // CRM obrigatório
  if (!doctor.crm || !/^\d{4,8}$/.test(doctor.crm)) {
    errors.push({
      code: 'DOCTOR_CRM_INVALID',
      field: 'doctor.crm',
      message: 'CRM deve conter entre 4 e 8 dígitos',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "a"',
    })
  }
  
  // UF do CRM obrigatório
  if (!doctor.crmState || !/^[A-Z]{2}$/.test(doctor.crmState.toUpperCase())) {
    errors.push({
      code: 'DOCTOR_CRM_STATE_INVALID',
      field: 'doctor.crmState',
      message: 'UF do CRM deve ter 2 letras (ex: SP, RJ)',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "a"',
    })
  }
  
  // Endereço obrigatório
  if (!doctor.address || doctor.address.trim().length < 10) {
    errors.push({
      code: 'DOCTOR_ADDRESS_REQUIRED',
      field: 'doctor.address',
      message: 'Endereço profissional é obrigatório',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "a"',
    })
  }
  
  // RQE obrigatório se tem especialidade
  if (doctor.specialty && !doctor.rqe) {
    errors.push({
      code: 'DOCTOR_RQE_REQUIRED',
      field: 'doctor.rqe',
      message: 'RQE é obrigatório quando informada especialidade',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "b"',
    })
  }
  
  return errors
}

/**
 * Valida informações do paciente (CFM 2.299/2021 Art. 2º)
 */
export function validatePatient(patient: PatientInfo): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Nome obrigatório
  if (!patient.name || patient.name.trim().length < 3) {
    errors.push({
      code: 'PATIENT_NAME_REQUIRED',
      field: 'patient.name',
      message: 'Nome do paciente é obrigatório (mínimo 3 caracteres)',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "c"',
    })
  }
  
  // Documento obrigatório
  if (!patient.documentNumber || patient.documentNumber.trim().length < 5) {
    errors.push({
      code: 'PATIENT_DOCUMENT_REQUIRED',
      field: 'patient.documentNumber',
      message: 'Documento do paciente é obrigatório (CPF, RG ou CNS)',
      regulation: 'CFM 2.299/2021 Art. 2º, alínea "c"',
    })
  }
  
  // Validar CPF se informado
  if (patient.documentType === 'CPF' && patient.documentNumber) {
    const cpf = patient.documentNumber.replace(/\D/g, '')
    if (!isValidCPF(cpf)) {
      errors.push({
        code: 'PATIENT_CPF_INVALID',
        field: 'patient.documentNumber',
        message: 'CPF do paciente é inválido',
      })
    }
  }
  
  return errors
}

/**
 * Valida medicamento individual (Portaria 344/98, Lei 9.787/99)
 */
export function validateMedication(med: MedicationItem, index: number): {
  errors: ValidationError[]
  warnings: ValidationWarning[]
} {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const prefix = `medications[${index}]`
  
  // Nome genérico obrigatório (Lei 9.787/99)
  if (!med.genericName || med.genericName.trim().length < 2) {
    errors.push({
      code: 'MED_GENERIC_NAME_REQUIRED',
      field: `${prefix}.genericName`,
      message: `Medicamento ${index + 1}: Nome genérico (DCB) é obrigatório`,
      regulation: 'Lei 9.787/99 Art. 3º',
    })
  }
  
  // Concentração obrigatória
  if (!med.concentration || med.concentration.trim().length < 1) {
    errors.push({
      code: 'MED_CONCENTRATION_REQUIRED',
      field: `${prefix}.concentration`,
      message: `Medicamento ${index + 1}: Concentração é obrigatória`,
    })
  }
  
  // Quantidade obrigatória
  if (!med.quantity || med.quantity <= 0) {
    errors.push({
      code: 'MED_QUANTITY_REQUIRED',
      field: `${prefix}.quantity`,
      message: `Medicamento ${index + 1}: Quantidade deve ser maior que zero`,
    })
  }
  
  // Classificar medicamento
  const classification = classifyMedication(med.genericName)
  
  // Quantidade por extenso OBRIGATÓRIA para controlados (Portaria 344/98)
  if (classification.isControlled && !med.quantityWritten) {
    errors.push({
      code: 'MED_QUANTITY_WRITTEN_REQUIRED',
      field: `${prefix}.quantityWritten`,
      message: `Medicamento ${index + 1} (${med.genericName}): Quantidade por extenso é OBRIGATÓRIA para medicamentos controlados`,
      regulation: 'Portaria SVS/MS 344/98 Art. 35',
    })
  }
  
  // Validar posologia - deve ser técnica
  if (!med.dosage || !med.frequency || !med.duration) {
    errors.push({
      code: 'MED_POSOLOGY_INCOMPLETE',
      field: `${prefix}`,
      message: `Medicamento ${index + 1}: Posologia incompleta (dosagem, frequência e duração são obrigatórios)`,
    })
  }
  
  // Posologia não pode ser ambígua
  const fullPosology = `${med.dosage} ${med.frequency} ${med.duration}`.toLowerCase()
  const ambiguousTerms = [
    'se dor', 'se necessário', 'conforme necessário', 'quando necessário',
    'à noite', 'pela manhã', 'conforme orientação',
  ]
  
  if (ambiguousTerms.some(term => fullPosology.includes(term))) {
    errors.push({
      code: 'MED_POSOLOGY_AMBIGUOUS',
      field: `${prefix}`,
      message: `Medicamento ${index + 1}: Posologia ambígua não permitida. Use formato técnico: "X comprimido(s) por via Y a cada Z horas, não excedendo W doses ao dia"`,
      regulation: 'Manual CFM de Prescrição Médica',
    })
  }
  
  // Via de administração obrigatória
  if (!med.route) {
    warnings.push({
      code: 'MED_ROUTE_RECOMMENDED',
      field: `${prefix}.route`,
      message: `Medicamento ${index + 1}: Via de administração recomendada`,
      suggestion: 'Informe a via: oral, sublingual, intramuscular, etc.',
    })
  }
  
  // Aviso sobre antimicrobiano
  if (classification.isAntimicrobial) {
    warnings.push({
      code: 'MED_ANTIMICROBIAL_VALIDITY',
      field: `${prefix}`,
      message: `Medicamento ${index + 1} (${med.genericName}): Antimicrobiano - receita válida por 10 dias`,
      suggestion: 'Será gerada 2ª via para retenção na farmácia',
    })
  }
  
  return { errors, warnings }
}

/**
 * Valida prescrição completa
 */
export function validatePrescription(prescription: PrescriptionDocument): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Validar médico
  errors.push(...validateDoctor(prescription.doctor))
  
  // Validar paciente
  errors.push(...validatePatient(prescription.patient))
  
  // Validar medicamentos
  if (!prescription.medications || prescription.medications.length === 0) {
    errors.push({
      code: 'PRESCRIPTION_NO_MEDICATIONS',
      message: 'Prescrição deve conter pelo menos um medicamento',
    })
  } else {
    prescription.medications.forEach((med, index) => {
      const medValidation = validateMedication(med, index)
      errors.push(...medValidation.errors)
      warnings.push(...medValidation.warnings)
    })
  }
  
  // Verificar se há mistura de controlados A/B com outros tipos
  const hasListAB = prescription.medications.some(m => {
    const c = classifyMedication(m.genericName)
    return c.controlledType && ['A1', 'A2', 'A3', 'B1', 'B2'].includes(c.controlledType)
  })
  
  const hasNonControlled = prescription.medications.some(m => {
    const c = classifyMedication(m.genericName)
    return !c.isControlled && !c.isAntimicrobial
  })
  
  if (hasListAB && hasNonControlled) {
    warnings.push({
      code: 'MIXED_CONTROLLED_PRESCRIPTION',
      message: 'Prescrição contém medicamentos controlados (Lista A/B) e não controlados',
      suggestion: 'Considere separar em receitas diferentes: uma para controlados e outra para medicamentos comuns',
    })
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Valida atestado médico
 */
export function validateCertificate(certificate: MedicalCertificateDocument): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Validar médico
  errors.push(...validateDoctor(certificate.doctor))
  
  // Validar paciente
  errors.push(...validatePatient(certificate.patient))
  
  // Conteúdo obrigatório
  if (!certificate.content || certificate.content.trim().length < 10) {
    errors.push({
      code: 'CERTIFICATE_CONTENT_REQUIRED',
      field: 'content',
      message: 'Conteúdo do atestado é obrigatório (mínimo 10 caracteres)',
    })
  }
  
  // Se afastamento, dias são obrigatórios
  if (certificate.certificateType === 'MEDICAL_LEAVE') {
    if (!certificate.days || certificate.days <= 0) {
      errors.push({
        code: 'CERTIFICATE_DAYS_REQUIRED',
        field: 'days',
        message: 'Número de dias de afastamento é obrigatório',
      })
    }
    
    if (!certificate.startDate) {
      errors.push({
        code: 'CERTIFICATE_START_DATE_REQUIRED',
        field: 'startDate',
        message: 'Data de início do afastamento é obrigatória',
      })
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Valida encaminhamento
 */
export function validateReferral(referral: ReferralDocument): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Validar médico
  errors.push(...validateDoctor(referral.doctor))
  
  // Validar paciente
  errors.push(...validatePatient(referral.patient))
  
  // Especialidade de destino obrigatória
  if (!referral.targetSpecialty || referral.targetSpecialty.trim().length < 3) {
    errors.push({
      code: 'REFERRAL_SPECIALTY_REQUIRED',
      field: 'targetSpecialty',
      message: 'Especialidade de destino é obrigatória',
    })
  }
  
  // Motivo obrigatório
  if (!referral.reason || referral.reason.trim().length < 10) {
    errors.push({
      code: 'REFERRAL_REASON_REQUIRED',
      field: 'reason',
      message: 'Motivo do encaminhamento é obrigatório (mínimo 10 caracteres)',
    })
  }
  
  // Aviso sobre histórico clínico
  if (!referral.clinicalHistory) {
    warnings.push({
      code: 'REFERRAL_HISTORY_RECOMMENDED',
      field: 'clinicalHistory',
      message: 'Resumo do histórico clínico é recomendado para encaminhamentos',
      suggestion: 'Inclua diagnósticos prévios, exames relevantes e tratamentos realizados',
    })
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Valida solicitação de exame
 */
export function validateExamRequest(request: ExamRequestDocument): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Validar médico
  errors.push(...validateDoctor(request.doctor))
  
  // Validar paciente
  errors.push(...validatePatient(request.patient))
  
  // Exames obrigatórios
  if (!request.exams || request.exams.length === 0) {
    errors.push({
      code: 'EXAM_REQUEST_NO_EXAMS',
      message: 'Solicitação deve conter pelo menos um exame',
    })
  } else {
    request.exams.forEach((exam, index) => {
      if (!exam.name || exam.name.trim().length < 2) {
        errors.push({
          code: 'EXAM_NAME_REQUIRED',
          field: `exams[${index}].name`,
          message: `Exame ${index + 1}: Nome é obrigatório`,
        })
      }
    })
  }
  
  // Indicação clínica obrigatória
  if (!request.clinicalIndication || request.clinicalIndication.trim().length < 5) {
    errors.push({
      code: 'EXAM_INDICATION_REQUIRED',
      field: 'clinicalIndication',
      message: 'Indicação clínica é obrigatória',
    })
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Valida CPF
 */
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '')
  
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.charAt(10))) return false
  
  return true
}

/**
 * Converte número para extenso (português)
 */
export function numberToWords(num: number): string {
  if (num < 0 || num > 999) return String(num)
  
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  
  if (num === 0) return 'zero'
  if (num === 100) return 'cem'
  
  let words = ''
  
  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)]
    num %= 100
    if (num > 0) words += ' e '
  }
  
  if (num >= 20) {
    words += tens[Math.floor(num / 10)]
    num %= 10
    if (num > 0) words += ' e '
  } else if (num >= 10) {
    words += teens[num - 10]
    return words
  }
  
  if (num > 0) {
    words += units[num]
  }
  
  return words.trim()
}
