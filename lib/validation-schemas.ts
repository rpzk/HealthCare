import { z } from 'zod'

// Esquemas de validação para dados comuns
export const emailSchema = z.string().email('Email inválido')
export const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (11) 99999-9999')
export const cpfSchema = z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')
export const dateSchema = z.string().datetime('Data inválida') || z.date()

// Schema para criação/atualização de paciente
export const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: emailSchema.optional(),
  cpf: cpfSchema,
  rg: z.string().max(20, 'RG muito longo').optional(),
  birthDate: z.string().or(z.date()),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Gênero deve ser MALE, FEMALE ou OTHER' }) }),
  phone: z.string().max(20, 'Telefone muito longo').optional(),
  address: z.string().max(200, 'Endereço muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().max(2, 'Estado deve ter 2 caracteres').optional(),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  emergencyContact: z.string().max(100, 'Contato de emergência muito longo').optional(),
  bloodType: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional(),
  allergies: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  doctorId: z.string().cuid('ID do médico inválido')
})

// Schema para criação/atualização de consulta
export const consultationSchema = z.object({
  patientId: z.string().cuid('ID do paciente inválido'),
  doctorId: z.string().cuid('ID do médico inválido'),
  scheduledDate: z.string().datetime('Data da consulta inválida'),
  type: z.enum(['ROUTINE', 'EMERGENCY', 'FOLLOW_UP', 'INITIAL'], { 
    errorMap: () => ({ message: 'Tipo deve ser ROUTINE, EMERGENCY, FOLLOW_UP ou INITIAL' }) 
  }),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(1000, 'Descrição muito longa'),
  notes: z.string().max(2000, 'Notas muito longas').optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional().default('SCHEDULED'),
  duration: z.number().int().min(15, 'Duração mínima de 15 minutos').max(480, 'Duração máxima de 8 horas').optional().default(30)
})

// Schema para prescrições
export const prescriptionSchema = z.object({
  patientId: z.string().cuid('ID do paciente inválido'),
  consultationId: z.string().cuid('ID da consulta inválido').optional(),
  medications: z.array(z.object({
    name: z.string().min(2, 'Nome do medicamento deve ter pelo menos 2 caracteres'),
    dosage: z.string().min(1, 'Dosagem é obrigatória'),
    frequency: z.string().min(1, 'Frequência é obrigatória'),
    duration: z.string().min(1, 'Duração é obrigatória'),
    instructions: z.string().optional()
  })).min(1, 'Pelo menos um medicamento é obrigatório'),
  observations: z.string().max(1000, 'Observações muito longas').optional()
})

// Schema para registros médicos
export const medicalRecordSchema = z.object({
  patientId: z.string().cuid('ID do paciente inválido'),
  consultationId: z.string().cuid('ID da consulta inválido').optional(),
  type: z.enum(['ANAMNESIS', 'PHYSICAL_EXAM', 'DIAGNOSIS', 'TREATMENT_PLAN', 'FOLLOW_UP'], {
    errorMap: () => ({ message: 'Tipo inválido' })
  }),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres').max(5000, 'Conteúdo muito longo'),
  vitalSigns: z.object({
    temperature: z.number().min(30, 'Temperatura muito baixa').max(45, 'Temperatura muito alta').optional(),
    bloodPressure: z.object({
      systolic: z.number().min(60, 'Pressão sistólica muito baixa').max(250, 'Pressão sistólica muito alta'),
      diastolic: z.number().min(30, 'Pressão diastólica muito baixa').max(150, 'Pressão diastólica muito alta')
    }).optional(),
    heartRate: z.number().min(30, 'Frequência cardíaca muito baixa').max(200, 'Frequência cardíaca muito alta').optional(),
    weight: z.number().min(0.5, 'Peso muito baixo').max(500, 'Peso muito alto').optional(),
    height: z.number().min(30, 'Altura muito baixa').max(250, 'Altura muito alta').optional()
  }).optional()
})

// Schema para interações de IA
export const aiInteractionSchema = z.object({
  type: z.enum(['SYMPTOM_ANALYSIS', 'DRUG_INTERACTION', 'MEDICAL_SUMMARY', 'RECOMMENDATION'], {
    errorMap: () => ({ message: 'Tipo de interação IA inválido' })
  }),
  patientId: z.string().cuid('ID do paciente inválido').optional(),
  input: z.string().min(1, 'Input é obrigatório').max(5000, 'Input muito longo'),
  metadata: z.record(z.any()).optional()
})

// Helpers para validação
export function validatePatient(data: any) {
  const result = patientSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

export function validateConsultation(data: any) {
  const result = consultationSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

export function validatePrescription(data: any) {
  const result = prescriptionSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

export function validateMedicalRecord(data: any) {
  const result = medicalRecordSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

export function validateAiInteraction(data: any) {
  const result = aiInteractionSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// Schema para notificações
const notificationSchema = z.object({
  type: z.enum(['ai_analysis_complete', 'critical_alert', 'drug_interaction_warning', 'system_status', 'appointment_reminder', 'patient_update'], {
    errorMap: () => ({ message: 'Tipo inválido para notificação' })
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Prioridade deve ser low, medium, high ou critical' })
  }),
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(2000, 'Mensagem muito longa'),
  patientId: z.string().optional(),
  consultationId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export function validateNotification(data: any) {
  const result = notificationSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// Schema para análise de sintomas com IA
const symptomAnalysisSchema = z.object({
  symptoms: z.array(z.string().min(1, 'Descrição do sintoma é obrigatória')).min(1, 'Pelo menos um sintoma é obrigatório'),
  patientAge: z.number().int().min(0, 'Idade inválida').max(120, 'Idade inválida'),
  patientGender: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'Gênero deve ser M ou F' })
  }),
  medicalHistory: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional()
  }).optional(),
  patientId: z.string().optional()
})

export function validateSymptomAnalysis(data: any) {
  const result = symptomAnalysisSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// ---------------- Geospatial & Structured Entities ----------------

// Basic GeoJSON Feature/Polygon/MultiPolygon validator (lightweight)
const geoJsonGeometryTypes = ['Polygon', 'MultiPolygon'] as const
const geoJsonSchema = z.object({
  type: z.literal('Feature').optional(),
  geometry: z.object({
    type: z.enum(geoJsonGeometryTypes),
    coordinates: z.any() // deeper structural validation could be added
  })
}).refine(v => !!v.geometry, { message: 'GeoJSON inválido: geometry ausente' })

export const addressSchema = z.object({
  street: z.string().min(1),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: z.string().regex(/^[0-9]{5}-?[0-9]{3}$/,'CEP inválido').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  patientId: z.string().cuid().optional(),
  microAreaId: z.string().cuid().optional(),
  isPrimary: z.boolean().optional()
})

export const placeSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  addressId: z.string().cuid().optional(),
  microAreaId: z.string().cuid().optional()
})

export const microAreaSchema = z.object({
  name: z.string().min(2),
  code: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
  polygonGeo: z.string().transform(s => s.trim()).optional().refine(val => {
    if (!val) return true
    try { const parsed = JSON.parse(val); geoJsonSchema.parse(parsed); return true } catch { return false }
  }, 'GeoJSON inválido (esperado Feature com Polygon ou MultiPolygon)'),
  centroidLat: z.number().min(-90).max(90).optional(),
  centroidLng: z.number().min(-180).max(180).optional()
  ,changedByUser: z.string().cuid().optional()
  ,reason: z.string().max(300).optional()
})

export function validateAddress(data:any){ const r = addressSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validatePlace(data:any){ const r = placeSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateMicroArea(data:any){ const r = microAreaSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }

// ---------------- Clinical Coding (CID10, CID11, CIAP2, NURSING) ----------------
import * as PrismaNS from '@prisma/client'
const { CodeSystemKind, DiagnosisStatus, DiagnosisCertainty } = PrismaNS as any

export const codeSystemUpsertSchema = z.object({
  kind: z.nativeEnum(CodeSystemKind),
  name: z.string().min(2),
  version: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional()
})

export const medicalCodeImportSchema = z.object({
  systemKind: z.nativeEnum(CodeSystemKind),
  systemVersion: z.string().max(40).optional(),
  rebuildSearchText: z.boolean().optional(),
  codes: z.array(z.object({
    code: z.string().min(1),
    display: z.string().min(1),
    description: z.string().optional(),
    parentCode: z.string().optional(),
    synonyms: z.array(z.string().min(1)).max(20).optional()
  })).min(1)
})

export const diagnosisCreateSchema = z.object({
  patientId: z.string().cuid(),
  consultationId: z.string().cuid().optional(),
  primaryCodeId: z.string().cuid(),
  secondaryCodeIds: z.array(z.string().cuid()).max(10).optional(),
  notes: z.string().max(5000).optional(),
  onsetDate: z.string().datetime().optional(),
  certainty: z.nativeEnum(DiagnosisCertainty).optional()
})

export const diagnosisUpdateSchema = z.object({
  status: z.nativeEnum(DiagnosisStatus).optional(),
  resolvedDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  certainty: z.nativeEnum(DiagnosisCertainty).optional(),
  secondaryCodeIds: z.array(z.string().cuid()).max(10).optional()
}).refine(v => Object.keys(v).length > 0, { message: 'Nada para atualizar' })

export function validateCodeSystem(data:any){ const r = codeSystemUpsertSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateCodeImport(data:any){ const r = medicalCodeImportSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateDiagnosisCreate(data:any){ const r = diagnosisCreateSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateDiagnosisUpdate(data:any){ const r = diagnosisUpdateSchema.safeParse(data); return { success:r.success, data: r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }

// ---------------- Occupations / Capability (CBO + Elliott Jaques) ----------------
import * as PrismaAll from '@prisma/client'
const { StratumLevel } = PrismaAll as any

export const cboGroupUpsertSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  level: z.number().int().min(1).max(4),
  parentCode: z.string().optional()
})

export const occupationUpsertSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(2),
  description: z.string().max(5000).optional(),
  groupCode: z.string().optional(),
  synonyms: z.array(z.string().min(1)).max(30).optional()
})

export const jobRoleCreateSchema = z.object({
  title: z.string().min(2),
  occupationCode: z.string().optional(),
  requiredMinStratum: z.nativeEnum(StratumLevel),
  requiredMaxStratum: z.nativeEnum(StratumLevel).optional(),
  description: z.string().max(8000).optional(),
  tasks: z.string().max(12000).optional(),
  capabilities: z.record(z.number().min(0).max(1)).optional()
})

export const assignUserRoleSchema = z.object({
  userId: z.string().cuid(),
  jobRoleId: z.string().cuid()
})

export const capabilityEvaluationSchema = z.object({
  subjectUserId: z.string().cuid(),
  evaluatorUserId: z.string().cuid(),
  jobRoleId: z.string().cuid().optional(),
  stratumAssessed: z.nativeEnum(StratumLevel),
  potentialStratum: z.nativeEnum(StratumLevel).optional(),
  timeSpanMonths: z.number().int().min(1).max(240).optional(),
  evidence: z.string().max(15000).optional(),
  gaps: z.record(z.any()).optional(),
  recommendations: z.string().max(15000).optional()
})

export function validateCboGroup(data:any){ const r = cboGroupUpsertSchema.safeParse(data); return { success:r.success, data:r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateOccupation(data:any){ const r = occupationUpsertSchema.safeParse(data); return { success:r.success, data:r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateJobRole(data:any){ const r = jobRoleCreateSchema.safeParse(data); return { success:r.success, data:r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateAssignUserRole(data:any){ const r = assignUserRoleSchema.safeParse(data); return { success:r.success, data:r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
export function validateCapabilityEvaluation(data:any){ const r = capabilityEvaluationSchema.safeParse(data); return { success:r.success, data:r.success? r.data:undefined, errors: r.success?undefined:r.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`) } }
