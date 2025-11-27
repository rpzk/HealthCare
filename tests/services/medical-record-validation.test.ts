/**
 * Unit Tests for Medical Record Validation and Helpers
 * Tests pure functions without database dependencies
 */

import { describe, it, expect } from 'vitest'

describe('Medical Record Validation Helpers', () => {
  // Vital Signs Validation
  describe('Vital Signs Validation', () => {
    const validateBloodPressure = (systolic: number, diastolic: number) => {
      const errors: string[] = []
      
      if (systolic < 60 || systolic > 300) {
        errors.push('Pressão sistólica deve estar entre 60 e 300 mmHg')
      }
      if (diastolic < 30 || diastolic > 200) {
        errors.push('Pressão diastólica deve estar entre 30 e 200 mmHg')
      }
      if (systolic <= diastolic) {
        errors.push('Pressão sistólica deve ser maior que diastólica')
      }

      return { valid: errors.length === 0, errors }
    }

    it('should accept valid blood pressure', () => {
      expect(validateBloodPressure(120, 80).valid).toBe(true)
      expect(validateBloodPressure(140, 90).valid).toBe(true)
    })

    it('should reject invalid systolic', () => {
      expect(validateBloodPressure(50, 80).valid).toBe(false)
      expect(validateBloodPressure(350, 80).valid).toBe(false)
    })

    it('should reject systolic <= diastolic', () => {
      expect(validateBloodPressure(80, 90).valid).toBe(false)
      expect(validateBloodPressure(80, 80).valid).toBe(false)
    })

    const validateHeartRate = (bpm: number) => {
      if (bpm < 30 || bpm > 250) {
        return { valid: false, error: 'Frequência cardíaca deve estar entre 30 e 250 bpm' }
      }
      return { valid: true }
    }

    it('should accept valid heart rate', () => {
      expect(validateHeartRate(70).valid).toBe(true)
      expect(validateHeartRate(100).valid).toBe(true)
    })

    it('should reject invalid heart rate', () => {
      expect(validateHeartRate(20).valid).toBe(false)
      expect(validateHeartRate(300).valid).toBe(false)
    })

    const validateTemperature = (temp: number) => {
      if (temp < 32 || temp > 45) {
        return { valid: false, error: 'Temperatura deve estar entre 32°C e 45°C' }
      }
      return { valid: true }
    }

    it('should accept valid temperature', () => {
      expect(validateTemperature(36.5).valid).toBe(true)
      expect(validateTemperature(38.0).valid).toBe(true)
    })

    it('should reject invalid temperature', () => {
      expect(validateTemperature(30).valid).toBe(false)
      expect(validateTemperature(50).valid).toBe(false)
    })

    const validateOxygenSaturation = (spo2: number) => {
      if (spo2 < 0 || spo2 > 100) {
        return { valid: false, error: 'Saturação O2 deve estar entre 0% e 100%' }
      }
      return { valid: true }
    }

    it('should accept valid oxygen saturation', () => {
      expect(validateOxygenSaturation(98).valid).toBe(true)
      expect(validateOxygenSaturation(95).valid).toBe(true)
    })

    it('should reject invalid oxygen saturation', () => {
      expect(validateOxygenSaturation(-5).valid).toBe(false)
      expect(validateOxygenSaturation(105).valid).toBe(false)
    })

    const validateRespiratoryRate = (rpm: number) => {
      if (rpm < 5 || rpm > 60) {
        return { valid: false, error: 'Frequência respiratória deve estar entre 5 e 60 rpm' }
      }
      return { valid: true }
    }

    it('should accept valid respiratory rate', () => {
      expect(validateRespiratoryRate(16).valid).toBe(true)
      expect(validateRespiratoryRate(20).valid).toBe(true)
    })

    it('should reject invalid respiratory rate', () => {
      expect(validateRespiratoryRate(3).valid).toBe(false)
      expect(validateRespiratoryRate(70).valid).toBe(false)
    })
  })

  // BMI Calculation
  describe('BMI Calculation', () => {
    const calculateBMI = (weightKg: number, heightCm: number): number => {
      const heightM = heightCm / 100
      return weightKg / (heightM * heightM)
    }

    const classifyBMI = (bmi: number): string => {
      if (bmi < 18.5) return 'Abaixo do peso'
      if (bmi < 25) return 'Peso normal'
      if (bmi < 30) return 'Sobrepeso'
      if (bmi < 35) return 'Obesidade grau I'
      if (bmi < 40) return 'Obesidade grau II'
      return 'Obesidade grau III'
    }

    it('should calculate BMI correctly', () => {
      expect(calculateBMI(70, 175)).toBeCloseTo(22.86, 1)
      expect(calculateBMI(90, 180)).toBeCloseTo(27.78, 1)
    })

    it('should classify BMI correctly', () => {
      expect(classifyBMI(17)).toBe('Abaixo do peso')
      expect(classifyBMI(22)).toBe('Peso normal')
      expect(classifyBMI(27)).toBe('Sobrepeso')
      expect(classifyBMI(32)).toBe('Obesidade grau I')
      expect(classifyBMI(37)).toBe('Obesidade grau II')
      expect(classifyBMI(42)).toBe('Obesidade grau III')
    })
  })

  // ICD-10 Code Validation
  describe('ICD-10 Code Validation', () => {
    const isValidICD10 = (code: string): boolean => {
      if (!code) return false
      // ICD-10 format: letter followed by 2-3 digits, optional decimal with 1-2 digits
      return /^[A-Z]\d{2}(\.\d{1,2})?$/i.test(code.toUpperCase())
    }

    it('should accept valid ICD-10 codes', () => {
      expect(isValidICD10('J18')).toBe(true)
      expect(isValidICD10('J18.9')).toBe(true)
      expect(isValidICD10('I10')).toBe(true)
      expect(isValidICD10('E11.9')).toBe(true)
      expect(isValidICD10('K21.0')).toBe(true)
    })

    it('should reject invalid ICD-10 codes', () => {
      expect(isValidICD10('123')).toBe(false)
      expect(isValidICD10('ABC')).toBe(false)
      expect(isValidICD10('J1')).toBe(false)
      expect(isValidICD10('')).toBe(false)
    })
  })

  // Prescription Validation
  describe('Prescription Validation', () => {
    interface PrescriptionItem {
      medication: string
      dosage: string
      frequency: string
      duration: string
    }

    const validatePrescriptionItem = (item: PrescriptionItem) => {
      const errors: string[] = []

      if (!item.medication || item.medication.trim().length < 2) {
        errors.push('Nome do medicamento é obrigatório')
      }
      if (!item.dosage || item.dosage.trim().length === 0) {
        errors.push('Dosagem é obrigatória')
      }
      if (!item.frequency || item.frequency.trim().length === 0) {
        errors.push('Frequência é obrigatória')
      }

      return { valid: errors.length === 0, errors }
    }

    it('should accept valid prescription item', () => {
      const item = {
        medication: 'Paracetamol',
        dosage: '500mg',
        frequency: '8/8h',
        duration: '5 dias',
      }
      expect(validatePrescriptionItem(item).valid).toBe(true)
    })

    it('should reject prescription without medication', () => {
      const item = {
        medication: '',
        dosage: '500mg',
        frequency: '8/8h',
        duration: '5 dias',
      }
      const result = validatePrescriptionItem(item)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Nome do medicamento é obrigatório')
    })

    it('should reject prescription without dosage', () => {
      const item = {
        medication: 'Paracetamol',
        dosage: '',
        frequency: '8/8h',
        duration: '5 dias',
      }
      const result = validatePrescriptionItem(item)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dosagem é obrigatória')
    })
  })

  // Allergy Alert Formatting
  describe('Allergy Formatting', () => {
    const formatAllergies = (allergies: string[]): string => {
      if (!allergies || allergies.length === 0) return 'Nenhuma alergia conhecida'
      return allergies.map(a => a.trim()).filter(a => a).join(', ')
    }

    const hasAllergyAlert = (allergies: string[], medication: string): boolean => {
      if (!allergies || allergies.length === 0) return false
      const lowerMed = medication.toLowerCase()
      return allergies.some(allergy => {
        const lowerAllergy = allergy.toLowerCase()
        return lowerMed.includes(lowerAllergy) || lowerAllergy.includes(lowerMed)
      })
    }

    it('should format allergies correctly', () => {
      expect(formatAllergies(['Dipirona', 'Penicilina'])).toBe('Dipirona, Penicilina')
      expect(formatAllergies([])).toBe('Nenhuma alergia conhecida')
    })

    it('should detect allergy alerts', () => {
      const allergies = ['Dipirona', 'Sulfa']
      expect(hasAllergyAlert(allergies, 'Dipirona 500mg')).toBe(true)
      expect(hasAllergyAlert(allergies, 'Paracetamol')).toBe(false)
      expect(hasAllergyAlert(allergies, 'Sulfametoxazol')).toBe(true)
    })
  })

  // Consultation Notes Sanitization
  describe('Notes Sanitization', () => {
    const sanitizeNotes = (notes: string): string => {
      if (!notes) return ''
      // Remove potential HTML/script tags completely (including content for script tags)
      let sanitized = notes.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove any remaining HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '')
      // Normalize whitespace
      return sanitized.replace(/\s+/g, ' ').trim()
    }

    it('should remove script tags with content', () => {
      expect(sanitizeNotes('<script>alert("xss")</script>Texto normal')).toBe('Texto normal')
    })

    it('should remove simple HTML tags', () => {
      expect(sanitizeNotes('<b>Bold</b> text')).toBe('Bold text')
    })

    it('should normalize whitespace', () => {
      expect(sanitizeNotes('Texto   com   espaços')).toBe('Texto com espaços')
      expect(sanitizeNotes('  Espaços no início e fim  ')).toBe('Espaços no início e fim')
    })

    it('should handle empty input', () => {
      expect(sanitizeNotes('')).toBe('')
      expect(sanitizeNotes(null as unknown as string)).toBe('')
    })
  })

  // Record Status Transitions
  describe('Record Status Transitions', () => {
    type RecordStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

    const VALID_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
      DRAFT: ['PENDING_REVIEW', 'ARCHIVED'],
      PENDING_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
      APPROVED: ['ARCHIVED'],
      REJECTED: ['DRAFT', 'ARCHIVED'],
      ARCHIVED: [],
    }

    const canTransition = (from: RecordStatus, to: RecordStatus): boolean => {
      return VALID_TRANSITIONS[from]?.includes(to) ?? false
    }

    it('should allow valid transitions', () => {
      expect(canTransition('DRAFT', 'PENDING_REVIEW')).toBe(true)
      expect(canTransition('PENDING_REVIEW', 'APPROVED')).toBe(true)
      expect(canTransition('REJECTED', 'DRAFT')).toBe(true)
    })

    it('should reject invalid transitions', () => {
      expect(canTransition('DRAFT', 'APPROVED')).toBe(false)
      expect(canTransition('ARCHIVED', 'DRAFT')).toBe(false)
      expect(canTransition('APPROVED', 'DRAFT')).toBe(false)
    })
  })

  // Date Range Validation for Medical Records
  describe('Date Range Validation', () => {
    const validateDateRange = (startDate: Date, endDate: Date): { valid: boolean; error?: string } => {
      if (startDate > endDate) {
        return { valid: false, error: 'Data inicial não pode ser posterior à data final' }
      }
      
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 365 * 5) {
        return { valid: false, error: 'Período máximo de busca é de 5 anos' }
      }

      return { valid: true }
    }

    it('should accept valid date ranges', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-06-01')
      expect(validateDateRange(start, end).valid).toBe(true)
    })

    it('should reject start after end', () => {
      const start = new Date('2024-06-01')
      const end = new Date('2024-01-01')
      const result = validateDateRange(start, end)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('posterior')
    })

    it('should reject range over 5 years', () => {
      const start = new Date('2010-01-01')
      const end = new Date('2024-01-01')
      const result = validateDateRange(start, end)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('5 anos')
    })
  })
})
