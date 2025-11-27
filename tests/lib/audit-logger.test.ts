import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditAction, auditLogger } from '@/lib/audit-logger'

describe('Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AuditAction enum', () => {
    it('should have authentication actions', () => {
      expect(AuditAction.LOGIN).toBe('LOGIN')
      expect(AuditAction.LOGOUT).toBe('LOGOUT')
      expect(AuditAction.LOGIN_FAILED).toBe('LOGIN_FAILED')
    })

    it('should have patient actions', () => {
      expect(AuditAction.PATIENT_CREATE).toBe('PATIENT_CREATE')
      expect(AuditAction.PATIENT_READ).toBe('PATIENT_READ')
      expect(AuditAction.PATIENT_UPDATE).toBe('PATIENT_UPDATE')
      expect(AuditAction.PATIENT_DELETE).toBe('PATIENT_DELETE')
    })

    it('should have consultation actions', () => {
      expect(AuditAction.CONSULTATION_CREATE).toBe('CONSULTATION_CREATE')
      expect(AuditAction.CONSULTATION_READ).toBe('CONSULTATION_READ')
      expect(AuditAction.CONSULTATION_UPDATE).toBe('CONSULTATION_UPDATE')
    })

    it('should have AI actions', () => {
      expect(AuditAction.AI_INTERACTION).toBe('AI_INTERACTION')
      expect(AuditAction.AI_ANALYSIS).toBe('AI_ANALYSIS')
    })

    it('should have security actions', () => {
      expect(AuditAction.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED')
      expect(AuditAction.CRITICAL_ANOMALY_DETECTED).toBe('CRITICAL_ANOMALY_DETECTED')
      expect(AuditAction.SECURITY_INCIDENT).toBe('SECURITY_INCIDENT')
    })
  })

  describe('auditLogger.logSuccess', () => {
    it('should be a function', () => {
      expect(typeof auditLogger.logSuccess).toBe('function')
    })
  })

  describe('auditLogger.logError', () => {
    it('should be a function', () => {
      expect(typeof auditLogger.logError).toBe('function')
    })
  })
})
