/**
 * Utilidades de masking e pseudonimização de respostas
 * 
 * LGPD-compliant:
 * - Profissionais de saúde (DOCTOR, NURSE) veem dados completos dos pacientes que atendem
 * - Admin/gestores veem dados PSEUDONIMIZADOS (gestão sem acesso a dados pessoais)
 * - Paciente vê próprios dados completos
 */

export interface MaskOptions {
  maskCpf?: boolean
  maskContact?: boolean
  partialEmail?: boolean
  exposeClinical?: boolean // when true, keep clinical fields like allergies/currentMedications
  isAdmin?: boolean // when true, PSEUDONYMIZE data (LGPD compliant)
  isSelf?: boolean // when true, expose ALL data (user accessing own data)
  isHealthcareProfessional?: boolean // DOCTOR, NURSE - see full data
}

interface PatientData {
  name?: string | null
  cpf?: string | null
  email?: string | null
  phone?: string | null
  emergencyContact?: string | null
  medicalHistory?: unknown
  allergies?: unknown
  currentMedications?: unknown
  address?: string | null
  motherName?: string | null
  [key: string]: unknown
}

export function maskCPF(cpf?: string | null) {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g,'')
  if (digits.length !== 11) return '***.***.***-**'
  return `***.${digits.slice(3,6)}.***-**`
}

export function maskEmail(email?: string | null) {
  if (!email) return null
  const [user, domain] = email.split('@')
  if (!domain) return '***@***.***'
  const [domainName, ...ext] = domain.split('.')
  return `${user[0]}***@${domainName[0]}***.${ext.join('.') || '***'}`
}

export function maskPhone(phone?: string | null) {
  if (!phone) return null
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 8) return '(***) ****-****'
  if (clean.length >= 10) {
    return `(${clean.slice(0, 2)}) ****-${clean.slice(-4)}`
  }
  return `****-${clean.slice(-4)}`
}

export function pseudonymizeName(name?: string | null) {
  if (!name) return '***'
  const parts = name.trim().split(/\s+/)
  return parts.map(part => {
    if (part.length <= 1) return '*'
    return part[0].toUpperCase() + '*'.repeat(Math.min(part.length - 1, 3))
  }).join(' ')
}

export function applyPatientMasking(patient: PatientData, opts: MaskOptions = {}) {
  if (!patient) return patient
  
  const { 
    maskCpf = true, 
    maskContact = true, 
    partialEmail = true, 
    exposeClinical = false,
    isAdmin = false,
    isSelf = false,
    isHealthcareProfessional = false
  } = opts
  
  // Próprio usuário vê TUDO
  if (isSelf) {
    return patient
  }
  
  // Profissionais de saúde veem dados completos (para atendimento)
  if (isHealthcareProfessional) {
    return patient
  }
  
  // Admin e outros veem dados PSEUDONIMIZADOS (LGPD)
  if (isAdmin) {
    return {
      ...patient,
      name: pseudonymizeName(patient.name),
      cpf: maskCPF(patient.cpf),
      email: maskEmail(patient.email),
      phone: maskPhone(patient.phone),
      emergencyContact: patient.emergencyContact ? '*** (oculto)' : undefined,
      address: patient.address ? '*** (endereço oculto)' : undefined,
      motherName: patient.motherName ? pseudonymizeName(patient.motherName) : undefined,
      // Admin não vê dados clínicos por padrão
      medicalHistory: undefined,
      allergies: undefined,
      currentMedications: undefined,
    }
  }
  
  // Outros usuários (recepcionista, etc) - masking parcial
  return {
    ...patient,
    cpf: maskCpf ? maskCPF(patient.cpf) : patient.cpf,
    email: partialEmail ? maskEmail(patient.email) : patient.email,
    phone: maskContact ? maskPhone(patient.phone) : patient.phone,
    emergencyContact: maskContact ? undefined : patient.emergencyContact,
    medicalHistory: exposeClinical ? patient.medicalHistory : undefined,
    allergies: exposeClinical ? patient.allergies : undefined,
    currentMedications: exposeClinical ? patient.currentMedications : undefined
  }
}

export function applyPatientsCollectionMasking(list: PatientData[], opts: MaskOptions = {}) {
  return list.map(p => applyPatientMasking(p, opts))
}
