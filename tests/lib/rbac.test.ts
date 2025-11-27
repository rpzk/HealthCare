import { describe, it, expect } from 'vitest'
import { RBAC_MATRIX, isAllowed, canEvaluate, canManageOccupation } from '@/lib/rbac'

describe('RBAC System', () => {
  describe('isAllowed', () => {
    it('should allow ADMIN to read patients', () => {
      expect(isAllowed('patient.read', 'ADMIN')).toBe(true)
    })

    it('should allow DOCTOR to read patients', () => {
      expect(isAllowed('patient.read', 'DOCTOR')).toBe(true)
    })

    it('should allow NURSE to read patients', () => {
      expect(isAllowed('patient.read', 'NURSE')).toBe(true)
    })

    it('should not allow RECEPTIONIST to read patients', () => {
      expect(isAllowed('patient.read', 'RECEPTIONIST')).toBe(false)
    })

    it('should only allow ADMIN and DOCTOR to write patients', () => {
      expect(isAllowed('patient.write', 'ADMIN')).toBe(true)
      expect(isAllowed('patient.write', 'DOCTOR')).toBe(true)
      expect(isAllowed('patient.write', 'NURSE')).toBe(false)
    })

    it('should only allow ADMIN to anonymize patients (LGPD)', () => {
      expect(isAllowed('patient.anonymize', 'ADMIN')).toBe(true)
      expect(isAllowed('patient.anonymize', 'DOCTOR')).toBe(false)
      expect(isAllowed('patient.anonymize', 'NURSE')).toBe(false)
    })

    it('should only allow ADMIN to view audit logs', () => {
      expect(isAllowed('audit.read', 'ADMIN')).toBe(true)
      expect(isAllowed('audit.read', 'DOCTOR')).toBe(false)
    })

    it('should return false for unknown actions', () => {
      expect(isAllowed('unknown.action', 'ADMIN')).toBe(false)
    })
  })

  describe('canEvaluate', () => {
    it('should allow ADMIN to evaluate', () => {
      expect(canEvaluate('ADMIN')).toBe(true)
    })

    it('should allow DOCTOR to evaluate', () => {
      expect(canEvaluate('DOCTOR')).toBe(true)
    })

    it('should not allow NURSE to evaluate', () => {
      expect(canEvaluate('NURSE')).toBe(false)
    })
  })

  describe('canManageOccupation', () => {
    it('should only allow ADMIN to manage occupations', () => {
      expect(canManageOccupation('ADMIN')).toBe(true)
      expect(canManageOccupation('DOCTOR')).toBe(false)
      expect(canManageOccupation('NURSE')).toBe(false)
    })
  })

  describe('RBAC_MATRIX structure', () => {
    it('should have all expected actions defined', () => {
      const expectedActions = [
        'patient.read',
        'patient.write',
        'patient.export',
        'patient.anonymize',
        'audit.read',
        'ai.symptom_analysis',
        'ai.drug_interaction',
        'ai.summary',
        'backup.run',
      ]

      expectedActions.forEach(action => {
        expect(RBAC_MATRIX[action]).toBeDefined()
        expect(Array.isArray(RBAC_MATRIX[action])).toBe(true)
      })
    })
  })
})
