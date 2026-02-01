/**
 * Validation Schemas for API Routes
 * Centralized Zod schemas for all API endpoints
 * 
 * @module validation-schemas-api
 */

import { z } from 'zod'

// =============================================================================
// Common / Reusable Schemas
// =============================================================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const searchQuerySchema = z.object({
  search: z.string().max(200).optional(),
})

export const dateRangeQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Data inicial inválida' }).optional(),
  endDate: z.string().datetime({ message: 'Data final inválida' }).optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
})

export const idSchema = z.string().min(1, 'ID é obrigatório')
export const cuidSchema = z.string().cuid('ID inválido')

// =============================================================================
// Appointments / Consultations Schemas
// =============================================================================

// Using actual Prisma enum values
export const consultationStatusSchema = z.enum([
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
])

export const consultationTypeSchema = z.enum([
  'INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE', 'SPECIALIST'
])

export const appointmentQuerySchema = paginationQuerySchema.extend({
  date: z.string().optional(),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  status: consultationStatusSchema.optional(),
})

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'ID do paciente é obrigatório'),
  doctorId: z.string().min(1, 'ID do médico é obrigatório'),
  scheduledDate: z.string().datetime({ message: 'Data de agendamento inválida' }),
  type: consultationTypeSchema.default('ROUTINE'),
  duration: z.number().int().min(5).max(480).default(30),
  notes: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  // Recursos opcionais (sala, equipamentos)
  resourceIds: z.array(z.string()).optional(),
})

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: consultationStatusSchema.optional(),
})

// =============================================================================
// Consultations Schemas  
// =============================================================================

export const consultationQuerySchema = paginationQuerySchema.merge(searchQuerySchema).extend({
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  status: consultationStatusSchema.optional(),
  type: consultationTypeSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export const createConsultationSchema = z.object({
  patientId: z.string().min(1, 'ID do paciente é obrigatório'),
  doctorId: z.string().min(1, 'ID do médico é obrigatório'),
  scheduledDate: z.string().datetime({ message: 'Data de agendamento inválida' }),
  type: consultationTypeSchema,
  description: z.string().max(2000).optional().default(''),
  notes: z.string().max(5000).optional().default(''),
  duration: z.number().int().min(5).max(480).optional().default(60),
  status: consultationStatusSchema.optional().default('SCHEDULED'),
})

// =============================================================================
// Referrals Schemas
// =============================================================================

export const referralQuerySchema = paginationQuerySchema.merge(searchQuerySchema).extend({
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  specialty: z.string().max(100).optional(),
})

export const createReferralSchema = z.object({
  patientId: z.string().min(1, 'ID do paciente é obrigatório'),
  specialty: z.string().min(1, 'Especialidade é obrigatória').max(100),
  description: z.string().min(1, 'Descrição é obrigatória').max(2000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  notes: z.string().max(2000).optional(),
})

// =============================================================================
// Exam Requests Schemas
// =============================================================================

export const examRequestQuerySchema = paginationQuerySchema.merge(searchQuerySchema).extend({
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.string().max(100).optional(),
})

export const createExamRequestSchema = z.object({
  patientId: z.string().min(1, 'ID do paciente é obrigatório'),
  examType: z.string().min(1, 'Tipo de exame é obrigatório').max(100),
  description: z.string().min(1, 'Descrição é obrigatória').max(2000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  notes: z.string().max(2000).optional(),
  scheduledDate: z.string().datetime({ message: 'Data de agendamento inválida' }).optional(),
})

// =============================================================================
// Financial Schemas
// =============================================================================

export const financialQuerySchema = z.object({
  startDate: z.string().optional().transform(val => {
    if (!val) return new Date(new Date().setDate(1))
    return new Date(val)
  }),
  endDate: z.string().optional().transform(val => {
    if (!val) return new Date()
    return new Date(val)
  }),
})

export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Tipo deve ser INCOME ou EXPENSE' }) }),
  category: z.string().min(1, 'Categoria é obrigatória').max(50),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDate: z.string().datetime({ message: 'Data de vencimento inválida' }),
  paymentDate: z.string().datetime({ message: 'Data de pagamento inválida' }).optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional().default('PENDING'),
  patientId: z.string().optional(),
  consultationId: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

// =============================================================================
// Schedule Schemas
// =============================================================================

export const scheduleRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)'),
  slotDuration: z.number().int().min(5).max(120).optional().default(30),
  isActive: z.boolean().optional().default(true),
})

export const scheduleBodySchema = z.array(scheduleRuleSchema).min(1, 'Ao menos uma regra é necessária')

// =============================================================================
// Settings Schemas
// =============================================================================

// Using actual SettingCategory values from lib/settings.ts
export const settingCategorySchema = z.enum(['GENERAL', 'EMAIL', 'SECURITY', 'SYSTEM'])

export const settingsQuerySchema = z.object({
  category: settingCategorySchema,
})

export const createSettingSchema = z.object({
  key: z.string().min(1, 'Chave é obrigatória').max(100),
  value: z.any(),
  category: settingCategorySchema.optional(),
  description: z.string().max(500).optional(),
})

// =============================================================================
// Protocols Schemas
// =============================================================================

// Using actual Prisma enum values
export const protocolCategorySchema = z.enum([
  'HYPERTENSION', 'DIABETES', 'PRENATAL', 'CHILDCARE', 'MENTAL_HEALTH',
  'RESPIRATORY', 'INFECTIOUS', 'CHRONIC', 'PREVENTIVE', 'EMERGENCY', 'CUSTOM'
])

export const protocolQuerySchema = paginationQuerySchema.merge(searchQuerySchema).extend({
  category: protocolCategorySchema.optional(),
  includePublic: z.coerce.boolean().optional().default(false),
})

export const protocolPrescriptionSchema = z.object({
  medicationId: z.string().min(1),
  dosage: z.string().min(1).max(200),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  instructions: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const protocolExamSchema = z.object({
  examCatalogId: z.string().min(1),
  instructions: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const protocolReferralSchema = z.object({
  specialty: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const protocolDiagnosisSchema = z.object({
  medicalCodeId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
})

export const createProtocolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  category: protocolCategorySchema.optional().default('CUSTOM'),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  specialty: z.string().max(100).optional(),
  prescriptions: z.array(protocolPrescriptionSchema).optional().default([]),
  exams: z.array(protocolExamSchema).optional().default([]),
  referrals: z.array(protocolReferralSchema).optional().default([]),
  diagnoses: z.array(protocolDiagnosisSchema).optional().default([]),
})

// =============================================================================
// Profile Schemas
// =============================================================================

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100).optional(),
  phone: z.string().max(20).optional(),
  specialty: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
})

// =============================================================================
// Helper function to validate query params
// =============================================================================

export function parseQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return schema.parse(params)
}

export function safeParseQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  const result = schema.safeParse(params)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

// =============================================================================
// Export types for use in route handlers
// =============================================================================

export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>
export type CreateAppointment = z.infer<typeof createAppointmentSchema>
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>

export type ConsultationQuery = z.infer<typeof consultationQuerySchema>
export type CreateConsultation = z.infer<typeof createConsultationSchema>

export type ReferralQuery = z.infer<typeof referralQuerySchema>
export type CreateReferral = z.infer<typeof createReferralSchema>

export type ExamRequestQuery = z.infer<typeof examRequestQuerySchema>
export type CreateExamRequest = z.infer<typeof createExamRequestSchema>

export type FinancialQuery = z.infer<typeof financialQuerySchema>
export type CreateTransaction = z.infer<typeof createTransactionSchema>

export type ScheduleRule = z.infer<typeof scheduleRuleSchema>

export type SettingsQuery = z.infer<typeof settingsQuerySchema>
export type CreateSetting = z.infer<typeof createSettingSchema>

export type ProtocolQuery = z.infer<typeof protocolQuerySchema>
export type CreateProtocol = z.infer<typeof createProtocolSchema>

export type UpdateProfile = z.infer<typeof updateProfileSchema>
