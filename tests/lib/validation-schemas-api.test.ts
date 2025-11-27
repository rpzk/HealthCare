/**
 * Tests for API Validation Schemas
 * @module validation-schemas-api.test
 */

import { describe, it, expect } from 'vitest'
import {
  paginationQuerySchema,
  searchQuerySchema,
  appointmentQuerySchema,
  createAppointmentSchema,
  consultationQuerySchema,
  createConsultationSchema,
  referralQuerySchema,
  createReferralSchema,
  examRequestQuerySchema,
  createExamRequestSchema,
  financialQuerySchema,
  createTransactionSchema,
  scheduleRuleSchema,
  scheduleBodySchema,
  settingsQuerySchema,
  createSettingSchema,
  protocolQuerySchema,
  createProtocolSchema,
  updateProfileSchema,
  safeParseQueryParams,
} from '@/lib/validation-schemas-api'

describe('Pagination Schema', () => {
  it('should validate valid pagination params', () => {
    const result = paginationQuerySchema.safeParse({ page: '2', limit: '20' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should use defaults for missing params', () => {
    const result = paginationQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(10)
    }
  })

  it('should reject page > 1000', () => {
    const result = paginationQuerySchema.safeParse({ page: '1001' })
    expect(result.success).toBe(false)
  })

  it('should reject limit > 100', () => {
    const result = paginationQuerySchema.safeParse({ limit: '101' })
    expect(result.success).toBe(false)
  })
})

describe('Appointment Query Schema', () => {
  it('should validate appointment query params', () => {
    const result = appointmentQuerySchema.safeParse({
      page: '1',
      limit: '10',
      date: '2024-01-15',
      doctorId: 'doc123',
      status: 'SCHEDULED'
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid status', () => {
    const result = appointmentQuerySchema.safeParse({
      status: 'INVALID_STATUS'
    })
    expect(result.success).toBe(false)
  })
})

describe('Create Appointment Schema', () => {
  it('should validate valid appointment data', () => {
    const result = createAppointmentSchema.safeParse({
      patientId: 'patient123',
      doctorId: 'doctor123',
      scheduledAt: '2024-01-15T10:00:00.000Z',
      type: 'ROUTINE'
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing required fields', () => {
    const result = createAppointmentSchema.safeParse({
      patientId: 'patient123'
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid datetime format', () => {
    const result = createAppointmentSchema.safeParse({
      patientId: 'patient123',
      doctorId: 'doctor123',
      scheduledAt: 'invalid-date'
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid consultation types', () => {
    const types = ['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE', 'SPECIALIST']
    types.forEach(type => {
      const result = createAppointmentSchema.safeParse({
        patientId: 'p1',
        doctorId: 'd1',
        scheduledAt: '2024-01-15T10:00:00.000Z',
        type
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('Create Consultation Schema', () => {
  it('should validate valid consultation data', () => {
    const result = createConsultationSchema.safeParse({
      patientId: 'patient123',
      doctorId: 'doctor123',
      scheduledDate: '2024-01-15T10:00:00.000Z',
      type: 'ROUTINE'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.duration).toBe(60) // default
      expect(result.data.status).toBe('SCHEDULED') // default
    }
  })

  it('should reject invalid type', () => {
    const result = createConsultationSchema.safeParse({
      patientId: 'patient123',
      doctorId: 'doctor123',
      scheduledDate: '2024-01-15T10:00:00.000Z',
      type: 'INVALID_TYPE'
    })
    expect(result.success).toBe(false)
  })
})

describe('Create Referral Schema', () => {
  it('should validate valid referral data', () => {
    const result = createReferralSchema.safeParse({
      patientId: 'patient123',
      specialty: 'Cardiologia',
      description: 'Avaliação cardíaca'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('NORMAL') // default
    }
  })

  it('should reject missing required fields', () => {
    const result = createReferralSchema.safeParse({
      patientId: 'patient123'
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid priorities', () => {
    const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
    priorities.forEach(priority => {
      const result = createReferralSchema.safeParse({
        patientId: 'p1',
        specialty: 'Cardio',
        description: 'Test',
        priority
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('Create Exam Request Schema', () => {
  it('should validate valid exam request data', () => {
    const result = createExamRequestSchema.safeParse({
      patientId: 'patient123',
      examType: 'Hemograma',
      description: 'Exame de rotina'
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional scheduled date', () => {
    const result = createExamRequestSchema.safeParse({
      patientId: 'patient123',
      examType: 'Hemograma',
      description: 'Exame de rotina',
      scheduledDate: '2024-01-20T09:00:00.000Z'
    })
    expect(result.success).toBe(true)
  })
})

describe('Financial Schemas', () => {
  it('should validate transaction data', () => {
    const result = createTransactionSchema.safeParse({
      type: 'INCOME',
      category: 'Consulta',
      description: 'Consulta particular',
      amount: 250.00,
      dueDate: '2024-01-15T00:00:00.000Z'
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative amounts', () => {
    const result = createTransactionSchema.safeParse({
      type: 'INCOME',
      category: 'Consulta',
      description: 'Test',
      amount: -100,
      dueDate: '2024-01-15T00:00:00.000Z'
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid transaction type', () => {
    const result = createTransactionSchema.safeParse({
      type: 'INVALID',
      category: 'Test',
      description: 'Test',
      amount: 100,
      dueDate: '2024-01-15T00:00:00.000Z'
    })
    expect(result.success).toBe(false)
  })
})

describe('Schedule Schema', () => {
  it('should validate schedule rule', () => {
    const result = scheduleRuleSchema.safeParse({
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '12:00'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slotDuration).toBe(30) // default
      expect(result.data.isActive).toBe(true) // default
    }
  })

  it('should reject invalid day of week', () => {
    const result = scheduleRuleSchema.safeParse({
      dayOfWeek: 7,
      startTime: '08:00',
      endTime: '12:00'
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid time format', () => {
    const result = scheduleRuleSchema.safeParse({
      dayOfWeek: 1,
      startTime: '8:00',
      endTime: '25:00'
    })
    expect(result.success).toBe(false)
  })

  it('should validate schedule body array', () => {
    const result = scheduleBodySchema.safeParse([
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' }
    ])
    expect(result.success).toBe(true)
  })

  it('should reject empty schedule array', () => {
    const result = scheduleBodySchema.safeParse([])
    expect(result.success).toBe(false)
  })
})

describe('Settings Schema', () => {
  it('should validate valid settings category', () => {
    const categories = ['GENERAL', 'EMAIL', 'SECURITY', 'SYSTEM']
    categories.forEach(category => {
      const result = settingsQuerySchema.safeParse({ category })
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid category', () => {
    const result = settingsQuerySchema.safeParse({ category: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('should validate setting creation', () => {
    const result = createSettingSchema.safeParse({
      key: 'clinic_name',
      value: 'Clínica Saúde',
      category: 'GENERAL'
    })
    expect(result.success).toBe(true)
  })
})

describe('Protocol Schema', () => {
  it('should validate protocol query', () => {
    const result = protocolQuerySchema.safeParse({
      category: 'DIABETES',
      includePublic: 'true'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.includePublic).toBe(true)
    }
  })

  it('should validate protocol creation', () => {
    const result = createProtocolSchema.safeParse({
      name: 'Protocolo Diabetes Tipo 2'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('CUSTOM') // default
      expect(result.data.isPublic).toBe(false) // default
    }
  })

  it('should accept valid protocol categories', () => {
    const categories = [
      'HYPERTENSION', 'DIABETES', 'PRENATAL', 'CHILDCARE', 
      'MENTAL_HEALTH', 'RESPIRATORY', 'INFECTIOUS', 'CHRONIC',
      'PREVENTIVE', 'EMERGENCY', 'CUSTOM'
    ]
    categories.forEach(category => {
      const result = createProtocolSchema.safeParse({
        name: 'Test Protocol',
        category
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('Profile Schema', () => {
  it('should validate profile update', () => {
    const result = updateProfileSchema.safeParse({
      name: 'Dr. João Silva',
      phone: '(11) 99999-9999',
      specialty: 'Cardiologia'
    })
    expect(result.success).toBe(true)
  })

  it('should reject name too short', () => {
    const result = updateProfileSchema.safeParse({
      name: 'A'
    })
    expect(result.success).toBe(false)
  })

  it('should allow partial updates', () => {
    const result = updateProfileSchema.safeParse({
      phone: '(11) 88888-8888'
    })
    expect(result.success).toBe(true)
  })
})

describe('safeParseQueryParams helper', () => {
  it('should parse URLSearchParams correctly', () => {
    const params = new URLSearchParams('page=2&limit=20')
    const result = safeParseQueryParams(params, paginationQuerySchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should return error for invalid params', () => {
    const params = new URLSearchParams('page=invalid')
    const result = safeParseQueryParams(params, paginationQuerySchema)
    expect(result.success).toBe(false)
  })
})
