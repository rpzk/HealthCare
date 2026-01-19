/**
 * Backup Orchestrator Tests
 * 
 * Tests for BackupOrchestrator factory pattern including:
 * - System backup execution
 * - Certificate backup execution
 * - Combined backup
 * - Cleanup of old backups
 * - Restore testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackupOrchestrator } from '@/lib/backup-orchestrator'

// Mock the backup services
vi.mock('@/lib/backup-service', () => ({
  runFullBackup: vi.fn(async () => ({
    success: true,
    timestamp: new Date(),
    duration: 5000,
    backupPath: '/backups/system-20260119.tar.gz',
    errors: []
  })),
  cleanupOldBackups: vi.fn(async () => ({
    deleted: 3,
    freedSpace: 1024 * 1024 * 500
  }))
}))

vi.mock('@/lib/certificate-backup-service', () => ({
  createDailyBackup: vi.fn(async () => ({
    success: true,
    timestamp: new Date(),
    backupPath: '/backups/certificates-20260119.tar.gz',
    certificateCount: 45
  }))
}))

describe('BackupOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('runBackup', () => {
    it('should run system backup when type is "system"', async () => {
      const result = await BackupOrchestrator.runBackup('system')
      
      expect(result.success).toBe(true)
      expect(result.systemBackup).toBeDefined()
      expect(result.systemBackup?.success).toBe(true)
      expect(result.systemBackup?.backupPath).toContain('system')
    })

    it('should run certificate backup when type is "certificates"', async () => {
      const result = await BackupOrchestrator.runBackup('certificates')
      
      expect(result.success).toBe(true)
      expect(result.certificateBackup).toBeDefined()
      expect(result.certificateBackup?.success).toBe(true)
      expect(result.certificateBackup?.backupPath).toContain('certificates')
    })

    it('should run both backups when type is "all"', async () => {
      const result = await BackupOrchestrator.runBackup('all')
      
      expect(result.success).toBe(true)
      expect(result.systemBackup).toBeDefined()
      expect(result.certificateBackup).toBeDefined()
      expect(result.systemBackup?.success).toBe(true)
      expect(result.certificateBackup?.success).toBe(true)
    })

    it('should include timestamp and duration in result', async () => {
      const result = await BackupOrchestrator.runBackup('system')
      
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle backup errors gracefully', async () => {
      const { runFullBackup } = await import('@/lib/backup-service')
      vi.mocked(runFullBackup).mockRejectedValueOnce(new Error('Backup failed'))

      const result = await BackupOrchestrator.runBackup('system')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Backup failed')
    })
  })

  describe('cleanupOldBackups', () => {
    it('should cleanup old backups', async () => {
      await expect(BackupOrchestrator.cleanupOldBackups()).resolves.not.toThrow()
    })

    it('should handle cleanup errors gracefully', async () => {
      const { cleanupOldBackups } = await import('@/lib/backup-service')
      vi.mocked(cleanupOldBackups).mockRejectedValueOnce(new Error('Cleanup failed'))

      await expect(BackupOrchestrator.cleanupOldBackups()).resolves.not.toThrow()
    })
  })

  describe('testRestore', () => {
    it('should test restore for system backup', async () => {
      const result = await BackupOrchestrator.testRestore('system')
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should test restore for certificate backup', async () => {
      const result = await BackupOrchestrator.testRestore('certificates')
      
      expect(result).toBeDefined()
    })
  })

  describe('getBackupStatus', () => {
    it('should return backup system status', async () => {
      const status = await BackupOrchestrator.getBackupStatus()
      
      expect(status).toBeDefined()
      expect(status.systemBackup).toBeDefined()
      expect(status.certificateBackup).toBeDefined()
    })
  })

  describe('scheduledDailyBackup', () => {
    it('should be a function', () => {
      const fn = require('@/lib/backup-orchestrator').scheduledDailyBackup
      expect(typeof fn).toBe('function')
    })
  })

  describe('scheduledWeeklyCleanup', () => {
    it('should be a function', () => {
      const fn = require('@/lib/backup-orchestrator').scheduledWeeklyCleanup
      expect(typeof fn).toBe('function')
    })
  })
})
