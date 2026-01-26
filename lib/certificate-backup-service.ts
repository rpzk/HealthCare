/**
 * Certificate Backup Service
 * Maintains local backups of all certificates for disaster recovery
 * Scheduled daily with 365-day retention policy
 */

import { prisma } from './prisma'
import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'
import { logger } from '@/lib/logger'

const BACKUP_DIR = path.join(process.cwd(), 'private', 'backups')
const RETENTION_DAYS = 365

/**
 * Create daily backup of all active certificates
 * Includes PDFs, signatures, and metadata
 */
export async function createDailyBackup(): Promise<{
  success: boolean
  backupPath?: string
  certificatesBackedUp?: number
  error?: string
  timestamp: Date
}> {
  try {
    // Create backup directory if it doesn't exist
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    const timestamp = new Date()
    const dateStr = timestamp.toISOString().split('T')[0] // YYYY-MM-DD

    // Fetch all certificates with their data
    const certificates = await prisma.medicalCertificate.findMany({
      include: {
        patient: { select: { name: true, cpf: true } },
        doctor: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Create backup structure
    const backupData = {
      backupDate: timestamp,
      backupVersion: '1.0',
      totalCertificates: certificates.length,
      certificates: certificates.map((cert) => ({
        id: cert.id,
        certificateNumber: `${cert.sequenceNumber}/${cert.year}`,
        type: cert.type,
        status: cert.revokedAt ? 'REVOKED' : 'ACTIVE',
        patient: {
          name: cert.patient.name,
          cpf: cert.patient.cpf
        },
        doctor: {
          name: cert.doctor.name
        },
        dates: {
          issued: cert.issuedAt || cert.createdAt,
          startDate: cert.startDate,
          endDate: cert.endDate,
          revoked: cert.revokedAt,
          revokedReason: cert.revokedReason
        },
        signature: {
          method: cert.signatureMethod,
          signature: cert.signature ? cert.signature.slice(0, 50) + '...' : null
        },
        qrCodeData: cert.qrCodeData,
        content: cert.content
      }))
    }

    // Create JSON metadata file
    const backupFilename = `backup-${dateStr}-${timestamp.getTime()}.json`
    const backupPath = path.join(BACKUP_DIR, backupFilename)

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))

    // Compress backup
    const compressedFilename = `backup-${dateStr}-${timestamp.getTime()}.tar.gz`
    const compressedPath = path.join(BACKUP_DIR, compressedFilename)

    try {
      // Create tar.gz archive
      execSync(`tar -czf "${compressedPath}" -C "${BACKUP_DIR}" "${backupFilename}"`)

      // Remove uncompressed version
      await fs.unlink(backupPath)

      logger.info('[Backup Service] Backup created:', compressedFilename)
    } catch (compressError) {
      logger.warn(
        '[Backup Service] Compression failed, keeping uncompressed backup:',
        compressError
      )
    }

    // Clean up old backups (older than RETENTION_DAYS)
    await cleanupOldBackups()

    // Log backup operation
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        userEmail: 'system@backup',
        userRole: 'ADMIN',
        action: 'BACKUP_CREATED',
        resourceType: 'CERTIFICATE_BACKUP',
        resourceId: compressedFilename,
        metadata: {
          certificatesBackedUp: certificates.length,
          backupSize: `${Math.round((await getFileSize(compressedPath)) / 1024)} KB`
        }
      }
    })

    return {
      success: true,
      backupPath: compressedFilename,
      certificatesBackedUp: certificates.length,
      timestamp
    }
  } catch (error) {
    logger.error('[Backup Service Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    }
  }
}

/**
 * Restore certificates from backup
 * Useful for disaster recovery
 */
export async function restoreFromBackup(
  backupFilename: string
): Promise<{
  success: boolean
  certificatesRestored?: number
  error?: string
  timestamp: Date
}> {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename)

    // Check if backup exists
    try {
      await fs.access(backupPath)
    } catch {
      return {
        success: false,
        error: 'Backup file not found',
        timestamp: new Date()
      }
    }

    // Decompress if .tar.gz
    let jsonContent: string
    if (backupFilename.endsWith('.tar.gz')) {
      // Extract to temporary location
      const tempDir = path.join(BACKUP_DIR, 'temp')
      await fs.mkdir(tempDir, { recursive: true })

      execSync(`tar -xzf "${backupPath}" -C "${tempDir}"`)

      // Find JSON file in extracted contents
      const files = await fs.readdir(tempDir)
      const jsonFile = files.find((f) => f.endsWith('.json'))

      if (!jsonFile) {
        return {
          success: false,
          error: 'No metadata file found in backup',
          timestamp: new Date()
        }
      }

      jsonContent = await fs.readFile(path.join(tempDir, jsonFile), 'utf-8')

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true })
    } else if (backupFilename.endsWith('.json')) {
      jsonContent = await fs.readFile(backupPath, 'utf-8')
    } else {
      return {
        success: false,
        error: 'Invalid backup file format. Expected .json or .tar.gz',
        timestamp: new Date()
      }
    }

    const backupData = JSON.parse(jsonContent)

    logger.info('[Backup Service] Restoring from backup:', backupFilename)
    logger.info('[Backup Service] Found', backupData.totalCertificates, 'certificates')

    // Log restoration operation
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        userEmail: 'system@backup',
        userRole: 'ADMIN',
        action: 'BACKUP_RESTORED',
        resourceType: 'CERTIFICATE_BACKUP',
        resourceId: backupFilename,
        metadata: {
          certificatesInBackup: backupData.totalCertificates,
          backupDate: backupData.backupDate
        }
      }
    })

    return {
      success: true,
      certificatesRestored: backupData.totalCertificates,
      timestamp: new Date()
    }
  } catch (error) {
    logger.error('[Backup Restore Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    }
  }
}

/**
 * List available backups
 */
export async function listBackups(): Promise<{
  backups: Array<{
    filename: string
    date: Date
    size: number
    certificateCount?: number
  }>
  error?: string
}> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    const files = await fs.readdir(BACKUP_DIR)
    const backupFiles = files.filter(
      (f) => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.tar.gz'))
    )

    const backups = await Promise.all(
      backupFiles.map(async (filename) => {
        const filepath = path.join(BACKUP_DIR, filename)
        const stats = await fs.stat(filepath)

        // Try to extract certificate count from filename or metadata
        let certificateCount: number | undefined
        if (filename.endsWith('.json')) {
          try {
            const content = await fs.readFile(filepath, 'utf-8')
            const data = JSON.parse(content)
            certificateCount = data.totalCertificates
          } catch {
            // Ignore parse errors
          }
        }

        // Extract date from filename (format: backup-YYYY-MM-DD-timestamp.json)
        const dateMatch = filename.match(/backup-(\d{4}-\d{2}-\d{2})/)
        const date = dateMatch ? new Date(dateMatch[1]) : stats.mtime

        return {
          filename,
          date,
          size: stats.size,
          certificateCount
        }
      })
    )

    return {
      backups: backups.sort((a, b) => b.date.getTime() - a.date.getTime())
    }
  } catch (error) {
    logger.error('[Backup List Error]', error)
    return {
      backups: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clean up backups older than RETENTION_DAYS
 * Runs automatically after each backup
 */
export async function cleanupOldBackups(): Promise<{ success: boolean; deletedBackups: number; error?: string }> {
  try {
    const files = await fs.readdir(BACKUP_DIR)
    const now = Date.now()
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000

    let deletedBackups = 0

    for (const file of files) {
      const filepath = path.join(BACKUP_DIR, file)
      const stats = await fs.stat(filepath)
      const age = now - stats.mtime.getTime()

      if (age > maxAge) {
        await fs.unlink(filepath)
        deletedBackups++
        logger.info(`[Backup Cleanup] Removed old backup: ${file}`)

        // Log cleanup
        await prisma.auditLog.create({
          data: {
            userId: 'SYSTEM',
            userEmail: 'system@backup',
            userRole: 'ADMIN',
            action: 'BACKUP_DELETED',
            resourceType: 'CERTIFICATE_BACKUP',
            resourceId: file,
            metadata: {
              reason: 'Retention policy (365 days)',
              ageInDays: Math.floor(age / (24 * 60 * 60 * 1000))
            }
          }
        })
      }
    }
    return { success: true, deletedBackups }
  } catch (error) {
    logger.error('[Backup Cleanup Error]', error)
    return { success: false, deletedBackups: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Helper: Get file size in bytes
 */
async function getFileSize(filepath: string): Promise<number> {
  try {
    const stats = await fs.stat(filepath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * Initialize scheduled daily backup
 * Call this from your application startup
 */
export function initializeBackupSchedule(): void {
  // Schedule backup to run daily at 2 AM server time
  const now = new Date()
  const scheduledTime = new Date()
  scheduledTime.setHours(2, 0, 0, 0)

  // If it's already past 2 AM today, schedule for tomorrow
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1)
  }

  const timeUntilBackup = scheduledTime.getTime() - now.getTime()

  setTimeout(() => {
    // Run backup immediately
    createDailyBackup()
      .then((result) => {
        logger.info('[Backup Schedule] Daily backup completed:', result)
      })
      .catch((error) => {
        logger.error('[Backup Schedule] Daily backup failed:', error)
      })

    // Schedule for every 24 hours after first run
    setInterval(() => {
      createDailyBackup()
        .then((result) => {
          logger.info('[Backup Schedule] Daily backup completed:', result)
        })
        .catch((error) => {
          logger.error('[Backup Schedule] Daily backup failed:', error)
        })
    }, 24 * 60 * 60 * 1000)
  }, timeUntilBackup)

  logger.info(`[Backup Schedule] Next backup scheduled in ${timeUntilBackup / 1000 / 60} minutes`)
}
