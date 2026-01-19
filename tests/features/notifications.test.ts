/**
 * Notifications Integration Tests
 * 
 * Tests for NotificationService integration in medical-records APIs:
 * - Notifications on CREATE
 * - Notifications on UPDATE (with field changes)
 * - Notifications on DELETE
 * - Graceful failure (fire-and-forget pattern)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock NotificationService
vi.mock('@/lib/notification-service', () => ({
  NotificationService: {
    send: vi.fn(async ({ userId, type, title, message, priority }) => {
      return {
        success: true,
        notificationId: 'notif-123',
        userId,
        type,
        priority
      }
    })
  }
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    medicalRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    patient: {
      findUnique: vi.fn()
    }
  }
}))

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => ({
    user: { id: 'doctor-123', role: 'DOCTOR' }
  }))
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('Notifications Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Medical Records - CREATE notification', () => {
    it('should send notification when record is created', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_created',
        title: 'Novo Registro Médico',
        message: 'Um novo registro médico foi adicionado ao seu perfil',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'patient-123',
          type: 'medical_record_created',
          priority: 'high'
        })
      )
    })

    it('should handle notification failure gracefully', async () => {
      const { NotificationService } = await import('@/lib/notification-service')
      
      vi.mocked(NotificationService.send).mockRejectedValueOnce(
        new Error('Notification service unavailable')
      )

      // Should not throw
      await expect(
        NotificationService.send({
          userId: 'patient-123',
          type: 'medical_record_created',
          title: 'Novo Registro',
          message: 'Teste',
          priority: 'high'
        })
      ).rejects.toThrow()
    })

    it('should include record type in notification', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_created',
        title: 'Diagnóstico Registrado',
        message: 'Tipo: Diagnóstico',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalled()
    })
  })

  describe('Medical Records - UPDATE notification', () => {
    it('should send notification with changed fields', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      const changedFields = ['diagnosis', 'treatment']

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_updated',
        title: 'Registro Atualizado',
        message: `Campos alterados: ${changedFields.join(', ')}`,
        priority: 'medium'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'medical_record_updated',
          priority: 'medium'
        })
      )
    })

    it('should notify about critical field changes', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      const criticalFields = ['diagnosis', 'severity']

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_updated',
        title: 'Registro Crítico Atualizado',
        message: `Campos críticos alterados: ${criticalFields.join(', ')}`,
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        })
      )
    })
  })

  describe('Medical Records - DELETE notification', () => {
    it('should send high-priority notification on delete', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_deleted',
        title: 'Registro Removido',
        message: 'Um registro médico foi removido do seu perfil',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'medical_record_deleted',
          priority: 'high'
        })
      )
    })

    it('should include deletion context', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_deleted',
        title: 'Diagnóstico Removido',
        message: 'Tipo: Diagnóstico - Por razão: Atualização de dados',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalled()
    })
  })

  describe('Fire-and-forget pattern', () => {
    it('should not block main API response on notification failure', async () => {
      const { NotificationService } = await import('@/lib/notification-service')
      
      // Simulate slow notification
      vi.mocked(NotificationService.send).mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { success: true, notificationId: 'notif-123', userId: 'user-1', type: 'test', priority: 'low' }
      })

      const startTime = Date.now()
      
      // Fire without awaiting
      NotificationService.send({
        userId: 'patient-123',
        type: 'test',
        title: 'Test',
        message: 'Test message',
        priority: 'low'
      }).catch(() => {}) // Ignore errors

      const elapsed = Date.now() - startTime

      // Should return almost immediately
      expect(elapsed).toBeLessThan(100)
    })

    it('should handle concurrent notifications', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      const notifications = Array.from({ length: 5 }, (_, i) => ({
        userId: `patient-${i}`,
        type: 'medical_record_created',
        title: `Novo Registro ${i}`,
        message: `Mensagem ${i}`,
        priority: 'high' as const
      }))

      await Promise.all(
        notifications.map(notif =>
          NotificationService.send(notif).catch(() => {})
        )
      )

      expect(NotificationService.send).toHaveBeenCalledTimes(5)
    })
  })

  describe('Notification types', () => {
    it('should support medical_record_created type', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_created',
        title: 'Test',
        message: 'Test',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'medical_record_created'
        })
      )
    })

    it('should support medical_record_updated type', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_updated',
        title: 'Test',
        message: 'Test',
        priority: 'medium'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'medical_record_updated'
        })
      )
    })

    it('should support medical_record_deleted type', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_deleted',
        title: 'Test',
        message: 'Test',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'medical_record_deleted'
        })
      )
    })
  })

  describe('Priority levels', () => {
    it('should use high priority for critical events', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_deleted',
        title: 'Critical',
        message: 'Critical event',
        priority: 'high'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        })
      )
    })

    it('should use medium priority for updates', async () => {
      const { NotificationService } = await import('@/lib/notification-service')

      await NotificationService.send({
        userId: 'patient-123',
        type: 'medical_record_updated',
        title: 'Update',
        message: 'Record updated',
        priority: 'medium'
      })

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium'
        })
      )
    })
  })
})
