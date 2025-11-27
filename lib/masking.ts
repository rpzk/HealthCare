// Utilidades de masking e sanitização de respostas
// Garante que campos sensíveis não vazem inadvertidamente em respostas padrão

export interface MaskOptions {
  maskCpf?: boolean
  maskContact?: boolean
  partialEmail?: boolean
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
  const { maskCpf = true, maskContact = true, partialEmail = true } = opts
  return {
    ...patient,
    cpf: maskCpf ? maskCPF(patient.cpf) : patient.cpf,
    email: partialEmail ? maskEmail(patient.email) : patient.email,
    phone: maskContact ? (patient.phone ? patient.phone.replace(/.(?=.{4})/g,'*') : null) : patient.phone,
    emergencyContact: maskContact ? undefined : patient.emergencyContact,
    medicalHistory: undefined, // nunca expor em listagens padrão
    allergies: undefined,
    currentMedications: undefined
  }
}

export function applyPatientsCollectionMasking(list: PatientData[]) {
  return list.map(p => applyPatientMasking(p))
}
