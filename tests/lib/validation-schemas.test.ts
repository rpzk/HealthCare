import { describe, it, expect } from 'vitest'
import {
  validatePatient,
  validateConsultation,
  validatePrescription,
  patientSchema,
  consultationSchema,
} from '@/lib/validation-schemas'

describe('Validation Schemas', () => {
  describe('patientSchema', () => {
    it('should validate a valid patient', () => {
      const validPatient = {
        name: 'João Silva',
        cpf: '123.456.789-00',
        birthDate: '1990-01-15',
        gender: 'MALE',
        doctorId: 'clx123abc456def789ghi',
      }

      const result = patientSchema.safeParse(validPatient)
      expect(result.success).toBe(true)
    })

    it('should reject patient with short name', () => {
      const invalidPatient = {
        name: 'J',
        cpf: '123.456.789-00',
        birthDate: '1990-01-15',
        gender: 'MALE',
        doctorId: 'clx123abc456def789ghi',
      }

      const result = validatePatient(invalidPatient)
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
    })

    it('should reject patient with invalid CPF format', () => {
      const invalidPatient = {
        name: 'João Silva',
        cpf: '12345678900', // Missing dots and dash
        birthDate: '1990-01-15',
        gender: 'MALE',
        doctorId: 'clx123abc456def789ghi',
      }

      const result = validatePatient(invalidPatient)
      expect(result.success).toBe(false)
    })

    it('should reject patient with invalid gender', () => {
      const invalidPatient = {
        name: 'João Silva',
        cpf: '123.456.789-00',
        birthDate: '1990-01-15',
        gender: 'INVALID',
        doctorId: 'clx123abc456def789ghi',
      }

      const result = validatePatient(invalidPatient)
      expect(result.success).toBe(false)
    })
  })

  describe('consultationSchema', () => {
    it('should validate a valid consultation', () => {
      const validConsultation = {
        patientId: 'clx123abc456def789ghi',
        doctorId: 'clx987zyx654wvu321tsr',
        scheduledDate: '2024-12-15T10:00:00.000Z',
        type: 'ROUTINE',
        description: 'Consulta de rotina para acompanhamento',
      }

      const result = consultationSchema.safeParse(validConsultation)
      expect(result.success).toBe(true)
    })

    it('should reject consultation with short description', () => {
      const invalidConsultation = {
        patientId: 'clx123abc456def789ghi',
        doctorId: 'clx987zyx654wvu321tsr',
        scheduledDate: '2024-12-15T10:00:00.000Z',
        type: 'ROUTINE',
        description: 'Short', // Less than 10 characters
      }

      const result = validateConsultation(invalidConsultation)
      expect(result.success).toBe(false)
    })

    it('should reject consultation with invalid type', () => {
      const invalidConsultation = {
        patientId: 'clx123abc456def789ghi',
        doctorId: 'clx987zyx654wvu321tsr',
        scheduledDate: '2024-12-15T10:00:00.000Z',
        type: 'INVALID_TYPE',
        description: 'Consulta de rotina para acompanhamento',
      }

      const result = validateConsultation(invalidConsultation)
      expect(result.success).toBe(false)
    })
  })

  describe('validatePrescription', () => {
    it('should validate a valid prescription', () => {
      const validPrescription = {
        patientId: 'clx123abc456def789ghi',
        medications: [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: '8/8h',
            duration: '5 dias',
          },
        ],
      }

      const result = validatePrescription(validPrescription)
      expect(result.success).toBe(true)
    })

    it('should reject prescription without medications', () => {
      const invalidPrescription = {
        patientId: 'clx123abc456def789ghi',
        medications: [],
      }

      const result = validatePrescription(invalidPrescription)
      expect(result.success).toBe(false)
    })
  })
})
