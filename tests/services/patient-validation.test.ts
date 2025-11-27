/**
 * Unit Tests for Patient Validation and Helpers
 * Tests pure functions without database dependencies
 */

import { describe, it, expect } from 'vitest'

describe('Patient Validation Helpers', () => {
  // CPF Validation
  const isValidCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '')
    if (cleanCPF.length !== 11) return false
    if (/^(\d)\1+$/.test(cleanCPF)) return false
    
    // Validate check digits
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i)
    }
    let digit = (sum * 10) % 11
    if (digit === 10 || digit === 11) digit = 0
    if (digit !== parseInt(cleanCPF[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i)
    }
    digit = (sum * 10) % 11
    if (digit === 10 || digit === 11) digit = 0
    if (digit !== parseInt(cleanCPF[10])) return false

    return true
  }

  describe('CPF Validation', () => {
    it('should accept valid CPF', () => {
      expect(isValidCPF('52998224725')).toBe(true)
      expect(isValidCPF('529.982.247-25')).toBe(true)
    })

    it('should reject invalid CPF', () => {
      expect(isValidCPF('12345678901')).toBe(false)
      expect(isValidCPF('00000000000')).toBe(false)
      expect(isValidCPF('11111111111')).toBe(false)
    })

    it('should reject CPF with wrong length', () => {
      expect(isValidCPF('123')).toBe(false)
      expect(isValidCPF('123456789012')).toBe(false)
      expect(isValidCPF('')).toBe(false)
    })
  })

  // Email Validation
  const isValidEmail = (email: string): boolean => {
    if (!email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.com.br')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('no@domain')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  // Phone Validation
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return false
    const clean = phone.replace(/\D/g, '')
    return clean.length === 10 || clean.length === 11
  }

  describe('Phone Validation', () => {
    it('should accept valid phones', () => {
      expect(isValidPhone('11999999999')).toBe(true)
      expect(isValidPhone('1133334444')).toBe(true)
      expect(isValidPhone('(11) 99999-9999')).toBe(true)
      expect(isValidPhone('(11) 3333-4444')).toBe(true)
    })

    it('should reject invalid phones', () => {
      expect(isValidPhone('123')).toBe(false)
      expect(isValidPhone('123456789')).toBe(false)
      expect(isValidPhone('')).toBe(false)
    })
  })

  // Birth Date Validation
  const isValidBirthDate = (date: Date): { valid: boolean; error?: string } => {
    const now = new Date()
    const minDate = new Date(now.getFullYear() - 150, 0, 1) // Max 150 years old
    const maxDate = now // Can't be in the future

    if (date > maxDate) {
      return { valid: false, error: 'Data de nascimento não pode ser no futuro' }
    }
    if (date < minDate) {
      return { valid: false, error: 'Data de nascimento inválida' }
    }
    return { valid: true }
  }

  describe('Birth Date Validation', () => {
    it('should accept valid birth dates', () => {
      expect(isValidBirthDate(new Date('1990-01-01')).valid).toBe(true)
      expect(isValidBirthDate(new Date('2020-06-15')).valid).toBe(true)
    })

    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const result = isValidBirthDate(futureDate)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('futuro')
    })

    it('should reject very old dates', () => {
      const oldDate = new Date('1800-01-01')
      const result = isValidBirthDate(oldDate)
      expect(result.valid).toBe(false)
    })
  })

  // Blood Type Validation
  const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  
  const isValidBloodType = (bloodType: string): boolean => {
    return VALID_BLOOD_TYPES.includes(bloodType)
  }

  describe('Blood Type Validation', () => {
    it('should accept valid blood types', () => {
      VALID_BLOOD_TYPES.forEach(type => {
        expect(isValidBloodType(type)).toBe(true)
      })
    })

    it('should reject invalid blood types', () => {
      expect(isValidBloodType('X+')).toBe(false)
      expect(isValidBloodType('A')).toBe(false)
      expect(isValidBloodType('')).toBe(false)
    })
  })

  // Name Formatting
  const formatName = (name: string): string => {
    if (!name || !name.trim()) return ''
    const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e']
    return name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        if (index > 0 && prepositions.includes(word)) {
          return word
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  describe('Name Formatting', () => {
    it('should capitalize names correctly', () => {
      expect(formatName('maria silva')).toBe('Maria Silva')
      expect(formatName('joao santos')).toBe('Joao Santos')
    })

    it('should handle prepositions', () => {
      expect(formatName('maria da silva')).toBe('Maria da Silva')
      expect(formatName('joao dos santos')).toBe('Joao dos Santos')
    })

    it('should handle empty input', () => {
      expect(formatName('')).toBe('')
      expect(formatName('   ')).toBe('')
    })
  })

  // CEP Validation
  const isValidCEP = (cep: string): boolean => {
    const clean = cep.replace(/\D/g, '')
    return clean.length === 8
  }

  describe('CEP Validation', () => {
    it('should accept valid CEPs', () => {
      expect(isValidCEP('01310100')).toBe(true)
      expect(isValidCEP('01310-100')).toBe(true)
    })

    it('should reject invalid CEPs', () => {
      expect(isValidCEP('123')).toBe(false)
      expect(isValidCEP('123456789')).toBe(false)
    })
  })

  // Age Calculation
  const calculateAge = (birthDate: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  describe('Age Calculation', () => {
    it('should calculate age correctly', () => {
      const thirtyYearsAgo = new Date()
      thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30)
      thirtyYearsAgo.setMonth(0) // January
      thirtyYearsAgo.setDate(1)
      
      expect(calculateAge(thirtyYearsAgo)).toBe(30)
    })

    it('should handle birthday not yet occurred this year', () => {
      const nextMonth = new Date()
      nextMonth.setFullYear(nextMonth.getFullYear() - 25)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      
      expect(calculateAge(nextMonth)).toBe(24)
    })
  })

  // Gender Validation
  const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER']
  
  const isValidGender = (gender: string): boolean => {
    return VALID_GENDERS.includes(gender)
  }

  describe('Gender Validation', () => {
    it('should accept valid genders', () => {
      expect(isValidGender('MALE')).toBe(true)
      expect(isValidGender('FEMALE')).toBe(true)
      expect(isValidGender('OTHER')).toBe(true)
    })

    it('should reject invalid genders', () => {
      expect(isValidGender('male')).toBe(false)
      expect(isValidGender('M')).toBe(false)
      expect(isValidGender('')).toBe(false)
    })
  })
})
