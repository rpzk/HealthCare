/**
 * Tests for Security Utilities
 * Rate limiting, masking, and authentication helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Rate Limiting Service', () => {
  // Mock in-memory rate limiter for testing
  const rateLimits = new Map<string, { count: number; resetAt: number }>()

  const checkRateLimit = (userId: string, operation: string, limit = 10, windowMs = 60000) => {
    const key = `${userId}:${operation}`
    const now = Date.now()
    const entry = rateLimits.get(key)

    if (!entry || entry.resetAt < now) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: limit - 1 }
    }

    if (entry.count >= limit) {
      return { 
        allowed: false, 
        remaining: 0,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      }
    }

    entry.count++
    return { allowed: true, remaining: limit - entry.count }
  }

  beforeEach(() => {
    rateLimits.clear()
  })

  it('should allow requests within limit', () => {
    const result = checkRateLimit('user-1', 'READ', 5)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('should track request count', () => {
    checkRateLimit('user-1', 'READ', 5)
    checkRateLimit('user-1', 'READ', 5)
    const result = checkRateLimit('user-1', 'READ', 5)
    expect(result.remaining).toBe(2)
  })

  it('should block requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('user-1', 'READ', 5)
    }
    const result = checkRateLimit('user-1', 'READ', 5)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should separate different operations', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('user-1', 'READ', 5)
    }
    const readResult = checkRateLimit('user-1', 'READ', 5)
    const writeResult = checkRateLimit('user-1', 'WRITE', 5)

    expect(readResult.allowed).toBe(false)
    expect(writeResult.allowed).toBe(true)
  })

  it('should separate different users', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('user-1', 'READ', 5)
    }
    const user1Result = checkRateLimit('user-1', 'READ', 5)
    const user2Result = checkRateLimit('user-2', 'READ', 5)

    expect(user1Result.allowed).toBe(false)
    expect(user2Result.allowed).toBe(true)
  })
})

describe('Data Masking', () => {
  const maskCPF = (cpf: string): string => {
    if (!cpf || cpf.length !== 11) return '***.***.***-**'
    return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`
  }

  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '***@***.***'
    const [local, domain] = email.split('@')
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '**'
    return `${maskedLocal}@${domain}`
  }

  const maskPhone = (phone: string): string => {
    if (!phone || phone.length < 8) return '(**) *****-****'
    const digits = phone.replace(/\D/g, '')
    return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`
  }

  const maskName = (name: string): string => {
    if (!name) return '***'
    const parts = name.split(' ')
    if (parts.length === 1) return `${name[0]}${'*'.repeat(name.length - 1)}`
    return `${parts[0]} ${'*'.repeat(8)}`
  }

  describe('CPF Masking', () => {
    it('should mask middle digits of CPF', () => {
      expect(maskCPF('12345678901')).toBe('123.***.***-01')
    })

    it('should handle invalid CPF', () => {
      expect(maskCPF('123')).toBe('***.***.***-**')
      expect(maskCPF('')).toBe('***.***.***-**')
    })
  })

  describe('Email Masking', () => {
    it('should mask email local part', () => {
      expect(maskEmail('joao.silva@email.com')).toBe('j********a@email.com')
    })

    it('should handle short emails', () => {
      expect(maskEmail('ab@test.com')).toBe('**@test.com')
    })

    it('should handle invalid emails', () => {
      expect(maskEmail('invalid')).toBe('***@***.***')
    })
  })

  describe('Phone Masking', () => {
    it('should mask phone middle digits', () => {
      expect(maskPhone('11999998888')).toBe('(11) *****-8888')
    })

    it('should handle formatted phone', () => {
      expect(maskPhone('(11) 99999-8888')).toBe('(11) *****-8888')
    })
  })

  describe('Name Masking', () => {
    it('should preserve first name only', () => {
      expect(maskName('João Silva')).toBe('João ********')
    })

    it('should mask single name', () => {
      expect(maskName('João')).toBe('J***')
    })
  })
})

describe('Password Validation', () => {
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Senha deve ter no mínimo 8 caracteres')
    }
    if (password.length > 128) {
      errors.push('Senha deve ter no máximo 128 caracteres')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um número')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial')
    }

    return { valid: errors.length === 0, errors }
  }

  it('should accept valid password', () => {
    const result = validatePassword('SecurePass123!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject short password', () => {
    const result = validatePassword('Ab1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Senha deve ter no mínimo 8 caracteres')
  })

  it('should require uppercase', () => {
    const result = validatePassword('securepass123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Senha deve conter pelo menos uma letra maiúscula')
  })

  it('should require lowercase', () => {
    const result = validatePassword('SECUREPASS123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Senha deve conter pelo menos uma letra minúscula')
  })

  it('should require number', () => {
    const result = validatePassword('SecurePass!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Senha deve conter pelo menos um número')
  })

  it('should require special character', () => {
    const result = validatePassword('SecurePass123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Senha deve conter pelo menos um caractere especial')
  })
})

describe('Session Token Validation', () => {
  const isValidToken = (token: string): boolean => {
    if (!token || typeof token !== 'string') return false
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return false
    // Each part should be base64-like
    const base64Regex = /^[A-Za-z0-9_-]+$/
    return parts.every(part => part.length > 0 && base64Regex.test(part))
  }

  it('should accept valid JWT format', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    expect(isValidToken(token)).toBe(true)
  })

  it('should reject invalid token format', () => {
    expect(isValidToken('')).toBe(false)
    expect(isValidToken('invalid')).toBe(false)
    expect(isValidToken('a.b')).toBe(false)
    expect(isValidToken('a.b.c.d')).toBe(false)
  })

  it('should reject token with invalid characters', () => {
    expect(isValidToken('a.b.c=')).toBe(false)
    expect(isValidToken('a.b.c!')).toBe(false)
  })
})
