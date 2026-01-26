/**
 * Medical Records Audit Service
 * Tracks all changes to medical records for compliance and security
 * Features:
 * - Log all CRUD operations (create, read, update, delete)
 * - Track who made the change and when
 * - Store before/after snapshots for updates
 * - Support for LGPD compliance queries
 */

import { logger } from '@/lib/logger'
import crypto from 'crypto'

export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LIST'

export interface AuditLog {
  id: string
  action: AuditAction
  resourceType: 'MEDICAL_RECORD'
  resourceId: string
  userId: string
  userEmail?: string
  userRole: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  changes?: {
    field: string
    before: unknown
    after: unknown
  }[]
  metadata?: {
    reason?: string
    notes?: string
    [key: string]: unknown
  }
  success: boolean
  error?: string
}

class MedicalRecordsAuditService {
  /**
   * Log a medical record operation
   */
  async logOperation(audit: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const auditEntry: AuditLog = {
      ...audit,
      id: `audit-${crypto.randomUUID()}`,
      timestamp: new Date()
    }

    // In Phase 3, this will be stored in database
    // For now, log to console and could be stored in memory
    try {
      // Persist to database using Prisma
      // We use a dynamic import or assume prisma is available globally/imported
      // Ideally import { prisma } from '@/lib/prisma' at the top
      const { prisma } = await import('@/lib/prisma');
      
      await prisma.auditLog.create({
        data: {
          action: auditEntry.action,
          resourceType: auditEntry.resourceType,
          resourceId: auditEntry.resourceId,
          userId: auditEntry.userId,
          userRole: auditEntry.userRole,
          success: auditEntry.success,
          errorMessage: auditEntry.error,
          changes: auditEntry.changes ? JSON.stringify(auditEntry.changes) : undefined,
          metadata: auditEntry.metadata ? JSON.stringify(auditEntry.metadata) : undefined,
          ipAddress: auditEntry.ipAddress,
          userAgent: auditEntry.userAgent,
          userEmail: auditEntry.userEmail || '',
        }
      });
    } catch (dbError) {
      logger.error('Failed to persist audit log to database:', dbError);
      // Fallback to console
    }

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUDIT) {
      logger.info('[Medical Records Audit]', {
        action: audit.action,
        resourceId: audit.resourceId,
        userId: audit.userId,
        userRole: audit.userRole,
        success: audit.success
      })
    }

    // Log errors prominently
    if (!audit.success && audit.error) {
      logger.error('[Medical Records Audit Error]', {
        action: audit.action,
        resourceId: audit.resourceId,
        error: audit.error
      })
    }

    return auditEntry
  }

  /**
   * Log CREATE operation
   */
  async logCreate(
    recordId: string,
    data: Record<string, unknown>,
    userId: string,
    userRole: string,
    userEmail?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    return this.logOperation({
      action: 'CREATE',
      resourceType: 'MEDICAL_RECORD',
      resourceId: recordId,
      userId,
      userEmail,
      userRole,
      changes: Object.entries(data).map(([field, value]) => ({
        field,
        before: null,
        after: value
      })),
      metadata,
      success: true
    })
  }

  /**
   * Log READ operation
   */
  async logRead(
    recordId: string,
    userId: string,
    userRole: string,
    userEmail?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    return this.logOperation({
      action: 'READ',
      resourceType: 'MEDICAL_RECORD',
      resourceId: recordId,
      userId,
      userEmail,
      userRole,
      metadata,
      success: true
    })
  }

  /**
   * Log UPDATE operation with before/after snapshots
   */
  async logUpdate(
    recordId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    userId: string,
    userRole: string,
    userEmail?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    // Calculate changes
    const changes: { field: string; before: unknown; after: unknown }[] = []
    
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes.push({
          field: key,
          before: before[key],
          after: after[key]
        })
      }
    }

    return this.logOperation({
      action: 'UPDATE',
      resourceType: 'MEDICAL_RECORD',
      resourceId: recordId,
      userId,
      userEmail,
      userRole,
      changes,
      metadata,
      success: true
    })
  }

  /**
   * Log DELETE operation
   */
  async logDelete(
    recordId: string,
    data: Record<string, unknown>,
    userId: string,
    userRole: string,
    userEmail?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    return this.logOperation({
      action: 'DELETE',
      resourceType: 'MEDICAL_RECORD',
      resourceId: recordId,
      userId,
      userEmail,
      userRole,
      changes: Object.entries(data).map(([field, value]) => ({
        field,
        before: value,
        after: null
      })),
      metadata,
      success: true
    })
  }

  /**
   * Log LIST operation (paginated queries)
   */
  async logList(
    userId: string,
    userRole: string,
    userEmail?: string,
    filters?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    return this.logOperation({
      action: 'LIST',
      resourceType: 'MEDICAL_RECORD',
      resourceId: 'multiple',
      userId,
      userEmail,
      userRole,
      metadata: {
        filters,
        ...metadata
      },
      success: true
    })
  }

  /**
   * Log operation failure
   */
  async logError(
    action: AuditAction,
    resourceId: string,
    userId: string,
    userRole: string,
    userEmail: string | undefined,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    return this.logOperation({
      action,
      resourceType: 'MEDICAL_RECORD',
      resourceId,
      userId,
      userEmail,
      userRole,
      metadata,
      success: false,
      error
    })
  }

  /**
   * Get audit trail for a specific record
   * Returns all operations performed on the record
   */
  async getRecordAuditTrail(recordId: string): Promise<AuditLog[]> {
    // In Phase 3, this will query the database
    // For now, return empty array
    if (process.env.DEBUG_AUDIT) {
      logger.info('[Audit Trail] Retrieving for record:', recordId)
    }
    return []
  }

  /**
   * Get all operations by a user
   * For compliance and security investigations
   */
  async getUserOperations(userId: string, limit: number = 100): Promise<AuditLog[]> {
    // In Phase 3, this will query the database
    if (process.env.DEBUG_AUDIT) {
      logger.info('[User Operations] Retrieving for user:', userId, 'limit:', limit)
    }
    return []
  }

  /**
   * Get all sensitive operations (deletes, updates to sensitive fields)
   */
  async getSensitiveOperations(limit: number = 100): Promise<AuditLog[]> {
    // In Phase 3, this will query the database
    if (process.env.DEBUG_AUDIT) {
      logger.info('[Sensitive Operations] Retrieving with limit:', limit)
    }
    return []
  }

  /**
   * Check if user has access to view audit logs
   */
  isAuditAccessAllowed(userRole: string): boolean {
    // Only ADMIN and AUDIT_OFFICER roles can view audit logs
    return ['ADMIN', 'AUDIT_OFFICER'].includes(userRole)
  }
}

export const medicalRecordsAuditService = new MedicalRecordsAuditService()
