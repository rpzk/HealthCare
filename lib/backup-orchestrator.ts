/**
 * Backup Orchestrator
 * 
 * Coordena múltiplos serviços de backup (sistema completo + certificados)
 * e fornece interface unificada para agendamento e execução.
 * 
 * Factory Pattern: Centraliza lógica de backup em um único ponto de controle.
 */

import { backupService } from './backup-service'
import { 
  createDailyBackup as createCertificateBackup,
  cleanupOldBackups as cleanupCertificates,
  restoreFromBackup as restoreCertificates
} from './certificate-backup-service'
import { logger } from './logger'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export type BackupType = 'system' | 'certificates' | 'all'

export interface BackupResult {
  success: boolean
  timestamp: Date
  backupType: BackupType
  systemBackup?: {
    success: boolean
    dbBackupPath?: string
    filesBackupPath?: string
    size?: { dbMB: number; filesMB: number }
    s3Uploaded?: boolean
    googleDriveUploaded?: boolean
    errors?: string[]
  }
  certificateBackup?: {
    success: boolean
    backupPath?: string
    certificatesBackedUp?: number
    error?: string
  }
  errors: string[]
  duration: number
}

export interface RestoreResult {
  success: boolean
  backupType: BackupType
  message: string
  errors: string[]
}

/**
 * Backup Orchestrator - Gerencia todos os tipos de backup
 */
export class BackupOrchestrator {
  /**
   * Executa backup completo do sistema
   */
  static async runSystemBackup(): Promise<BackupResult['systemBackup']> {
    try {
      logger.info('Starting system backup (database + files)')
      const result = await backupService.runFullBackup()
      
      return {
        success: result.success,
        dbBackupPath: result.dbBackupPath,
        filesBackupPath: result.filesBackupPath,
        size: result.size,
        s3Uploaded: result.s3Uploaded,
        googleDriveUploaded: result.googleDriveUploaded,
        errors: result.errors
      }
    } catch (error) {
      logger.error({ error }, 'System backup failed')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Executa backup de certificados
   */
  static async runCertificateBackup(): Promise<BackupResult['certificateBackup']> {
    try {
      logger.info('Starting certificate backup')
      const result = await createCertificateBackup()
      
      return {
        success: result.success,
        backupPath: result.backupPath,
        certificatesBackedUp: result.certificatesBackedUp,
        error: result.error
      }
    } catch (error) {
      logger.error({ error }, 'Certificate backup failed')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Executa backup unificado (sistema + certificados ou seletivo)
   */
  static async runBackup(type: BackupType = 'all'): Promise<BackupResult> {
    const startTime = Date.now()
    const result: BackupResult = {
      success: false,
      timestamp: new Date(),
      backupType: type,
      errors: [],
      duration: 0
    }

    try {
      logger.info({ type }, 'Starting orchestrated backup')

      // Execute backups based on type
      if (type === 'system' || type === 'all') {
        result.systemBackup = await this.runSystemBackup()
        if (!result.systemBackup?.success) {
          result.errors.push('System backup failed')
        }
      }

      if (type === 'certificates' || type === 'all') {
        result.certificateBackup = await this.runCertificateBackup()
        if (!result.certificateBackup?.success) {
          result.errors.push('Certificate backup failed')
        }
      }

      // Determine overall success
      if (type === 'all') {
        result.success = 
          (result.systemBackup?.success ?? false) && 
          (result.certificateBackup?.success ?? false)
      } else if (type === 'system') {
        result.success = result.systemBackup?.success ?? false
      } else {
        result.success = result.certificateBackup?.success ?? false
      }

      result.duration = Date.now() - startTime

      if (result.success) {
        logger.info({ 
          type, 
          duration: result.duration,
          systemSuccess: result.systemBackup?.success,
          certificatesCount: result.certificateBackup?.certificatesBackedUp
        }, 'Backup completed successfully')
      } else {
        logger.error({ 
          type, 
          errors: result.errors 
        }, 'Backup completed with errors')
      }

      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown orchestration error')
      result.duration = Date.now() - startTime
      
      logger.error({ error, type }, 'Backup orchestration failed')
      return result
    }
  }

  /**
   * Executa limpeza de backups antigos
   */
  static async cleanupOldBackups(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      logger.info('Starting cleanup of old backups')

      // Cleanup certificate backups (has built-in retention policy)
      const certCleanup = await cleanupCertificates()
      if (!certCleanup.success) {
        errors.push(`Certificate cleanup failed: ${certCleanup.error}`)
      } else {
        logger.info({ 
          deletedCount: certCleanup.deletedBackups 
        }, 'Certificate backups cleaned up')
      }

      // System backup cleanup (handled by backup-service internally)
      // backupService already handles retention policy

      return {
        success: errors.length === 0,
        errors
      }
    } catch (error) {
      logger.error({ error }, 'Cleanup failed')
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Testa restore de backup mais recente
   */
  static async testRestore(type: BackupType = 'system'): Promise<RestoreResult> {
    try {
      logger.info({ type }, 'Testing backup restore')

      if (type === 'certificates') {
        return {
          success: false,
          backupType: type,
          message: 'Certificate restore test requires a specific backup file',
          errors: ['Use restoreCertificateBackup(backupPath) instead']
        }
      }

      // Try to find the most recent DB backup file created by BackupService.
      const backupDir = process.env.BACKUP_DIR || './backups'
      const files = await readdir(backupDir).catch(() => [])
      const candidates = files
        .filter(f => f.startsWith('db_backup_'))
        .map(f => join(backupDir, f))

      let latest: { file: string; mtimeMs: number } | null = null
      for (const file of candidates) {
        try {
          const s = await stat(file)
          if (!latest || s.mtimeMs > latest.mtimeMs) {
            latest = { file, mtimeMs: s.mtimeMs }
          }
        } catch {
          // ignore unreadable
        }
      }

      if (!latest) {
        return {
          success: false,
          backupType: type,
          message: 'No backup file found to test restore',
          errors: [`No db_backup_* found in ${backupDir}`]
        }
      }

      const ok = await backupService.testRestore(latest.file)

      return {
        success: ok,
        backupType: type,
        message: ok ? 'System backup restore test successful' : 'System backup restore test failed',
        errors: ok ? [] : ['Restore test failed']
      }
    } catch (error) {
      logger.error({ error, type }, 'Restore test failed')
      return {
        success: false,
        backupType: type,
        message: 'Restore test failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Restaura certificados de um backup específico
   */
  static async restoreCertificateBackup(backupPath: string): Promise<RestoreResult> {
    try {
      logger.info({ backupPath }, 'Restoring certificates from backup')
      
      const result = await restoreCertificates(backupPath)
      
      return {
        success: result.success,
        backupType: 'certificates',
        message: result.success 
          ? `Restored ${result.certificatesRestored} certificates` 
          : 'Certificate restore failed',
        errors: result.error ? [result.error] : []
      }
    } catch (error) {
      logger.error({ error, backupPath }, 'Certificate restore failed')
      return {
        success: false,
        backupType: 'certificates',
        message: 'Certificate restore failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Obtém status dos backups
   */
  static async getBackupStatus(): Promise<{
    lastSystemBackup?: Date
    lastCertificateBackup?: Date
    systemBackupHealthy: boolean
    certificateBackupHealthy: boolean
  }> {
    try {
      // This would require reading backup metadata
      // Placeholder implementation
      return {
        systemBackupHealthy: true,
        certificateBackupHealthy: true
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get backup status')
      return {
        systemBackupHealthy: false,
        certificateBackupHealthy: false
      }
    }
  }
}

/**
 * Função helper para agendar backups diários
 * Usar com cron ou agendador de tarefas
 */
export async function scheduledDailyBackup() {
  logger.info('Running scheduled daily backup')
  
  const result = await BackupOrchestrator.runBackup('all')
  
  if (!result.success) {
    logger.error({ 
      errors: result.errors 
    }, 'Scheduled backup failed - alerting required')
    // Aqui você pode integrar com sistema de alertas (email, Slack, etc.)
  }
  
  return result
}

/**
 * Função helper para cleanup semanal
 */
export async function scheduledWeeklyCleanup() {
  logger.info('Running scheduled weekly cleanup')
  
  const result = await BackupOrchestrator.cleanupOldBackups()
  
  if (!result.success) {
    logger.error({ 
      errors: result.errors 
    }, 'Scheduled cleanup failed')
  }
  
  return result
}

// Export singleton instance
export const backupOrchestrator = BackupOrchestrator
