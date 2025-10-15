/**
 * Medical Records Rate Limiting Service
 * Prevents abuse and ensures fair usage of medical records API
 * Features:
 * - Per-user rate limiting
 * - Per-record update frequency limiting
 * - Per-doctor quota management
 * - Configurable thresholds by operation type
 */

export interface RateLimitConfig {
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  maxPerMinute: number
  maxPerHour: number
  maxPerDay: number
}

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

interface RequestLog {
  timestamp: number
  operation: string
  resourceId?: string
}

class RateLimitingService {
  /**
   * Default rate limit configurations
   */
  private defaultConfigs: RateLimitConfig[] = [
    {
      operation: 'CREATE',
      maxPerMinute: 10,
      maxPerHour: 100,
      maxPerDay: 500
    },
    {
      operation: 'READ',
      maxPerMinute: 60,
      maxPerHour: 1000,
      maxPerDay: 10000
    },
    {
      operation: 'UPDATE',
      maxPerMinute: 20,
      maxPerHour: 200,
      maxPerDay: 1000
    },
    {
      operation: 'DELETE',
      maxPerMinute: 5,
      maxPerHour: 50,
      maxPerDay: 200
    }
  ]

  /**
   * In-memory storage for rate limits
   * In Phase 3, this will be moved to Redis
   */
  private requestLogs: Map<string, RequestLog[]> = new Map()

  /**
   * Check if a request should be allowed
   */
  checkRateLimit(
    userId: string,
    operation: string,
    resourceId?: string
  ): RateLimitStatus {
    const config = this.getConfig(operation as any)
    if (!config) {
      // No limit config, allow by default
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date()
      }
    }

    const key = this.getKey(userId, resourceId)
    const logs = this.requestLogs.get(key) || []
    const now = Date.now()

    // Clean up old logs
    const oneMinuteAgo = now - 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const recentLogs = logs.filter(log => log.timestamp > oneDayAgo)
    this.requestLogs.set(key, recentLogs)

    // Check limits
    const lastMinute = recentLogs.filter(log => log.timestamp > oneMinuteAgo && log.operation === operation).length
    const lastHour = recentLogs.filter(log => log.timestamp > oneHourAgo && log.operation === operation).length
    const lastDay = recentLogs.filter(log => log.timestamp > oneDayAgo && log.operation === operation).length

    if (lastMinute >= config.maxPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + 60 * 1000),
        retryAfter: 60
      }
    }

    if (lastHour >= config.maxPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + 60 * 60 * 1000),
        retryAfter: 3600
      }
    }

    if (lastDay >= config.maxPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + 24 * 60 * 60 * 1000),
        retryAfter: 86400
      }
    }

    // Log the request
    recentLogs.push({
      timestamp: now,
      operation,
      resourceId
    })
    this.requestLogs.set(key, recentLogs)

    // Calculate remaining requests
    const remainingInMinute = Math.max(0, config.maxPerMinute - lastMinute - 1)

    return {
      allowed: true,
      remaining: remainingInMinute,
      resetAt: new Date(now + 60 * 1000)
    }
  }

  /**
   * Check rate limit for a specific record
   * Prevents too many updates to the same record
   */
  checkRecordUpdateLimit(
    userId: string,
    recordId: string,
    maxPerHour: number = 30
  ): RateLimitStatus {
    const key = `record-updates:${recordId}`
    const logs = this.requestLogs.get(key) || []
    const now = Date.now()

    // Clean up logs older than 1 hour
    const oneHourAgo = now - 60 * 60 * 1000
    const recentLogs = logs.filter(log => log.timestamp > oneHourAgo)
    this.requestLogs.set(key, recentLogs)

    if (recentLogs.length >= maxPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + 60 * 60 * 1000),
        retryAfter: 3600
      }
    }

    // Log the update
    recentLogs.push({
      timestamp: now,
      operation: 'UPDATE',
      resourceId: recordId
    })
    this.requestLogs.set(key, recentLogs)

    return {
      allowed: true,
      remaining: Math.max(0, maxPerHour - recentLogs.length),
      resetAt: new Date(now + 60 * 60 * 1000)
    }
  }

  /**
   * Reset rate limit for a user (admin only)
   */
  resetUserLimit(userId: string): void {
    // Find all keys starting with userId and delete them
    for (const key of this.requestLogs.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.requestLogs.delete(key)
      }
    }
  }

  /**
   * Get current usage statistics for a user
   */
  getUserStats(userId: string): Record<string, any> {
    const now = Date.now()
    const stats: Record<string, number> = {
      createdLastMinute: 0,
      createdLastHour: 0,
      createdLastDay: 0,
      updatedLastMinute: 0,
      updatedLastHour: 0,
      updatedLastDay: 0,
      deletedLastMinute: 0,
      deletedLastHour: 0,
      deletedLastDay: 0
    }

    const oneMinuteAgo = now - 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    for (const [key, logs] of this.requestLogs) {
      if (!key.startsWith(`${userId}:`)) continue

      for (const log of logs) {
        const operation = log.operation.toUpperCase()
        
        if (log.timestamp > oneMinuteAgo) {
          stats[`${operation.toLowerCase()}LastMinute`] =
            (stats[`${operation.toLowerCase()}LastMinute`] || 0) + 1
        }
        if (log.timestamp > oneHourAgo) {
          stats[`${operation.toLowerCase()}LastHour`] =
            (stats[`${operation.toLowerCase()}LastHour`] || 0) + 1
        }
        if (log.timestamp > oneDayAgo) {
          stats[`${operation.toLowerCase()}LastDay`] =
            (stats[`${operation.toLowerCase()}LastDay`] || 0) + 1
        }
      }
    }

    return stats
  }

  /**
   * Get configuration for an operation
   */
  private getConfig(operation: string): RateLimitConfig | undefined {
    return this.defaultConfigs.find(cfg => cfg.operation === operation)
  }

  /**
   * Generate cache key for rate limiting
   */
  private getKey(userId: string, resourceId?: string): string {
    return `${userId}:${resourceId || 'default'}`
  }

  /**
   * Get rate limit config for all operations
   */
  getAllConfigs(): RateLimitConfig[] {
    return this.defaultConfigs
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(operation: string, config: Partial<RateLimitConfig>): void {
    const index = this.defaultConfigs.findIndex(cfg => cfg.operation === operation as any)
    if (index >= 0) {
      this.defaultConfigs[index] = {
        ...this.defaultConfigs[index],
        ...config
      }
    }
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requestLogs.clear()
  }
}

export const rateLimitingService = new RateLimitingService()
