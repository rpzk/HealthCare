// Utilidades de masking e sanitização de respostas
// Garante que campos sensíveis não vazem inadvertidamente em respostas padrão

export interface MaskOptions {
  maskCpf?: boolean
  maskContact?: boolean
  partialEmail?: boolean
  exposeClinical?: boolean // when true, keep clinical fields like allergies/currentMedications
  isAdmin?: boolean // when true, expose ALL data (no masking)
  isSelf?: boolean // when true, expose ALL data (user accessing own data)
}

interface PatientData {
  cpf?: string | null
  email?: string | null
  phone?: string | null
  emergencyContact?: string | null
  medicalHistory?: unknown
  allergies?: unknown
  currentMedications?: unknown
  [key: string]: unknown
}

export function maskCPF(cpf?: string | null) {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g,'')
  if (digits.length !== 11) return '***'
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.***.$3-**')
}

export function maskEmail(email?: string | null) {
  if (!email) return null
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return user[0] + '***@' + domain
}

export function applyPatientMasking(patient: PatientData, opts: MaskOptions = {}) {
  if (!patient) return patient
  
  const { 
    maskCpf = true, 
    maskContact = true, 
    partialEmail = true, 
    exposeClinical = false,
    isAdmin = false,
    isSelf = false
  } = opts
  
  // Admin e próprio usuário veem TUDO sem mascaramento
  if (isAdmin || isSelf) {
    return patient
  }
  
  return {
    ...patient,
    cpf: maskCpf ? maskCPF(patient.cpf) : patient.cpf,
    email: partialEmail ? maskEmail(patient.email) : patient.email,
    phone: maskContact ? (patient.phone ? patient.phone.replace(/.(?=.{4})/g,'*') : null) : patient.phone,
    emergencyContact: maskContact ? undefined : patient.emergencyContact,
    medicalHistory: exposeClinical ? patient.medicalHistory : undefined,
    allergies: exposeClinical ? patient.allergies : undefined,
    currentMedications: exposeClinical ? patient.currentMedications : undefined
  }
}

export function applyPatientsCollectionMasking(list: PatientData[], opts: MaskOptions = {}) {
  return list.map(p => applyPatientMasking(p, opts))
}
