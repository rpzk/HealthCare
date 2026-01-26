import { z } from 'zod'

/**
 * SCHEMA CANÔNICO ÚNICO PARA PACIENTES
 * 
 * Este arquivo define o schema de validação autoritativo para dados de pacientes.
 * TODOS os endpoints devem usar este schema para garantir consistência.
 */

// ============================================
// ENUMS E CONSTANTES
// ============================================

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export type BloodType = typeof BLOOD_TYPES[number]

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const
export type Gender = typeof GENDERS[number]

// Mapa de conversão de formatos antigos de tipo sanguíneo
const BLOOD_TYPE_MAP: Record<string, BloodType> = {
  'A_POSITIVE': 'A+',
  'A_NEGATIVE': 'A-',
  'B_POSITIVE': 'B+',
  'B_NEGATIVE': 'B-',
  'AB_POSITIVE': 'AB+',
  'AB_NEGATIVE': 'AB-',
  'O_POSITIVE': 'O+',
  'O_NEGATIVE': 'O-',
}

// ============================================
// HELPERS DE NORMALIZAÇÃO
// ============================================

/**
 * Normaliza tipo sanguíneo para formato padrão (A+, B-, etc)
 */
export function normalizeBloodType(value: string | null | undefined): BloodType | null {
  if (!value) return null
  
  const upper = value.toUpperCase().trim()
  
  // Se já está no formato correto
  if (BLOOD_TYPES.includes(upper as BloodType)) {
    return upper as BloodType
  }
  
  // Tentar converter de formato antigo
  const normalized = upper.replace(/\s/g, '_')
  if (normalized in BLOOD_TYPE_MAP) {
    return BLOOD_TYPE_MAP[normalized]
  }
  
  // Tentar remover espaços: "A +" → "A+"
  const compact = upper.replace(/\s/g, '')
  if (BLOOD_TYPES.includes(compact as BloodType)) {
    return compact as BloodType
  }
  
  return null
}

/**
 * Normaliza CPF removendo formatação
 */
export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string | null | undefined): string | null {
  if (!cpf) return null
  const digits = normalizeCPF(cpf)
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Converte uma data para um Date em 12:00 UTC do mesmo dia.
 * Isso evita divergências de fuso horário (ex.: 10/04 virar 09/04 em UTC-3).
 */
export function toNoonUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0))
}

/**
 * Faz parse de entrada YYYY-MM-DD para um Date em 12:00 UTC.
 */
export function parseBirthDateYYYYMMDDToNoonUtc(value: string): Date {
  const dateOnly = value.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error('Data de nascimento inválida (YYYY-MM-DD)')
  }
  return new Date(`${dateOnly}T12:00:00.000Z`)
}

/**
 * Serializa Date para ISO em 12:00 UTC (string) para evitar shift de dia.
 */
export function serializeBirthDateToIsoNoonUtc(value: Date | null | undefined): string | null {
  if (!value) return null
  const normalized = toNoonUtc(value)
  return normalized.toISOString()
}

/**
 * Parse de alergias - aceita string ou array e retorna array
 */
export function parseAllergies(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  
  // Tentar parsear como JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      // Não é JSON, dividir por vírgula
      return value.split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  
  return []
}

/**
 * Serializa alergias para armazenamento
 */
export function serializeAllergies(allergies: string[]): string {
  return JSON.stringify(allergies.filter(Boolean))
}

// ============================================
// SCHEMAS ZOD
// ============================================

/**
 * Schema para tipo sanguíneo
 */
export const bloodTypeSchema = z.enum(BLOOD_TYPES)

/**
 * Schema para CPF - aceita com ou sem formatação
 */
export const cpfSchema = z
  .string()
  .transform(normalizeCPF)
  .pipe(
    z.string()
      .length(11, 'CPF deve conter exatamente 11 dígitos')
      .regex(/^\d{11}$/, 'CPF deve conter apenas números')
  )

/**
 * Schema opcional de CPF - aceita null/undefined
 */
export const cpfOptionalSchema = z
  .string()
  .optional()
  .nullable()
  .transform(val => val ? normalizeCPF(val) : null)

/**
 * Schema para data de nascimento
 * Aceita string ISO, Date object, ou timestamp
 */
export const birthDateSchema = z.coerce
  .date()
  .refine(
    date => {
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      return age >= 0 && age <= 150
    },
    { message: 'Data de nascimento inválida (idade deve estar entre 0 e 150 anos)' }
  )

/**
 * Schema para alergias - sempre retorna array
 */
export const allergiesSchema = z
  .union([
    z.array(z.string()),
    z.string(),
  ])
  .transform(parseAllergies)
  .default([])

/**
 * Schema base para dados de paciente (campos comuns)
 */
export const patientBaseSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  
  cpf: cpfOptionalSchema,
  
  email: z.string()
    .email('Email inválido')
    .nullable()
    .optional(),
  
  phone: z.string()
    .max(20, 'Telefone muito longo')
    .nullable()
    .optional(),
  
  birthDate: birthDateSchema,
  
  gender: z.enum(GENDERS, {
    errorMap: () => ({ message: 'Gênero deve ser MALE, FEMALE ou OTHER' })
  }),
  
  bloodType: z.string()
    .nullable()
    .optional()
    .transform(normalizeBloodType),
  
  allergies: allergiesSchema,
})

/**
 * Schema para CRIAÇÃO de paciente
 * Inclui campos obrigatórios apenas na criação
 */
export const patientCreateSchema = patientBaseSchema.extend({
  cpf: cpfSchema,  // Obrigatório na criação
  
  emergencyContact: z.string()
    .nullable()
    .optional(),
  
  address: z.string()
    .max(500, 'Endereço muito longo')
    .nullable()
    .optional(),
  
  medicalHistory: z.string()
    .max(5000, 'Histórico médico muito longo')
    .nullable()
    .optional(),
  
  currentMedications: z.string()
    .max(2000, 'Lista de medicamentos muito longa')
    .nullable()
    .optional(),
  
  riskLevel: z.enum(['BAIXO', 'MODERADO', 'ALTO'])
    .default('BAIXO'),
  
  latitude: z.number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),
  
  longitude: z.number()
    .min(-180)
    .max(180)
    .nullable()
    .optional(),
})

/**
 * Schema para ATUALIZAÇÃO de paciente
 * Todos os campos são opcionais
 */
export const patientUpdateSchema = patientBaseSchema.partial().extend({
  emergencyContact: z.string()
    .nullable()
    .optional(),
  
  address: z.string()
    .max(500, 'Endereço muito longo')
    .nullable()
    .optional(),
  
  medicalHistory: z.string()
    .max(5000, 'Histórico médico muito longo')
    .nullable()
    .optional(),
  
  currentMedications: z.string()
    .max(2000, 'Lista de medicamentos muito longa')
    .nullable()
    .optional(),
  
  riskLevel: z.enum(['BAIXO', 'MODERADO', 'ALTO'])
    .optional(),
  
  latitude: z.number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),
  
  longitude: z.number()
    .min(-180)
    .max(180)
    .nullable()
    .optional(),
})

/**
 * Schema para perfil do paciente (auto-edição)
 * Campos restritos que o paciente pode editar por conta própria
 */
export const patientProfileUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),

  // date-only (YYYY-MM-DD) recommended for client payloads
  birthDate: z.string().optional(),

  phone: z.string()
    .min(8)
    .max(20)
    .optional(),
  
  cpf: cpfOptionalSchema,

  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  
  bloodType: z.string()
    .nullable()
    .optional()
    .transform(normalizeBloodType),
  
  allergies: allergiesSchema,
  
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(8).max(20),
    relation: z.string().min(1),
  }).optional(),
  
  address: z.object({
    street: z.string().min(1),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    zipCode: z.string().optional(),
  }).optional(),
})

// ============================================
// TYPES TYPESCRIPT
// ============================================

export type PatientCreateInput = z.infer<typeof patientCreateSchema>
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>
export type PatientProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>
