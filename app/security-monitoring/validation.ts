import type {
  AuditLogEntry,
  AuditRecentResponse,
  RedisCombinedStats,
  SecurityOverview,
  SecurityOverviewResponse
} from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isSecurityOverviewResponse(payload: unknown): payload is SecurityOverviewResponse {
  if (!isObject(payload)) return false
  const candidate = payload as Partial<SecurityOverviewResponse>
  if (candidate.success !== true) return false
  if (typeof candidate.timestamp !== 'string') return false
  if (!isObject(candidate.overview)) return false

  const overview = candidate.overview as Partial<SecurityOverview>
  if (!isObject(overview.rateLimit) || !isObject(overview.audit)) return false

  const rateLimit = overview.rateLimit as Partial<SecurityOverview['rateLimit']>
  const audit = overview.audit as Partial<SecurityOverview['audit']>

  const rateLimitNumbers = [rateLimit.totalClients, rateLimit.blockedClients, rateLimit.totalRequests]
  const auditNumbers = [audit.totalRecent, audit.errors, audit.lastHour]

  if (rateLimitNumbers.some((value) => typeof value !== 'number')) return false
  if (auditNumbers.some((value) => typeof value !== 'number')) return false
  if (typeof overview.systemHealth !== 'string') return false

  return true
}

export function extractOverview(payload: unknown): SecurityOverview | null {
  if (!isObject(payload)) return null
  const candidate = payload as { overview?: unknown }
  if (!isObject(candidate.overview)) return null
  const overview = candidate.overview as Partial<SecurityOverview>
  const { rateLimit, audit, systemHealth } = overview
  if (!isObject(rateLimit) || !isObject(audit) || typeof systemHealth !== 'string') return null

  const rateLimitTyped = rateLimit as Partial<SecurityOverview['rateLimit']>
  const auditTyped = audit as Partial<SecurityOverview['audit']>

  const hasValidRateLimit =
    typeof rateLimitTyped.totalClients === 'number' &&
    typeof rateLimitTyped.blockedClients === 'number' &&
    typeof rateLimitTyped.totalRequests === 'number'
  const hasValidAudit =
    typeof auditTyped.totalRecent === 'number' &&
    typeof auditTyped.errors === 'number' &&
    typeof auditTyped.lastHour === 'number'

  if (!hasValidRateLimit || !hasValidAudit) return null

  return {
    rateLimit: {
      totalClients: rateLimitTyped.totalClients as number,
      blockedClients: rateLimitTyped.blockedClients as number,
      totalRequests: rateLimitTyped.totalRequests as number
    },
    audit: {
      totalRecent: auditTyped.totalRecent as number,
      errors: auditTyped.errors as number,
      lastHour: auditTyped.lastHour as number
    },
    systemHealth
  }
}

export function extractRedisStats(payload: unknown): RedisCombinedStats | null {
  if (!isObject(payload)) return null
  const candidate = payload as { redis?: unknown }
  if (!isObject(candidate.redis)) return null
  const redis = candidate.redis as Partial<RedisCombinedStats>
  if (!isObject(redis.rateLimiter) || !isObject(redis.cache)) return null
  const rateLimiter = redis.rateLimiter as Partial<RedisCombinedStats['rateLimiter']>
  const cache = redis.cache as Partial<RedisCombinedStats['cache']>

  const rateLimiterValid =
    typeof rateLimiter.redisConnected === 'boolean' &&
    typeof rateLimiter.totalKeys === 'number' &&
    typeof rateLimiter.activeUsers === 'number' &&
    typeof rateLimiter.blockedUsers === 'number' &&
    typeof rateLimiter.memoryFallbackEntries === 'number'

  const cacheValid =
    typeof cache.redisConnected === 'boolean' &&
    typeof cache.memoryFallbackEntries === 'number'

  if (!rateLimiterValid || !cacheValid) return null

  return {
    rateLimiter: {
      redisConnected: rateLimiter.redisConnected as boolean,
      totalKeys: rateLimiter.totalKeys as number,
      activeUsers: rateLimiter.activeUsers as number,
      blockedUsers: rateLimiter.blockedUsers as number,
      memoryFallbackEntries: rateLimiter.memoryFallbackEntries as number
    },
    cache: {
      redisConnected: cache.redisConnected as boolean,
      memoryFallbackEntries: cache.memoryFallbackEntries as number
    }
  }
}

export function extractAuditLogs(payload: unknown): AuditRecentResponse | null {
  if (!isObject(payload)) return null
  const candidate = payload as Partial<AuditRecentResponse>
  if (candidate.success !== true || typeof candidate.timestamp !== 'string') return null
  if (!Array.isArray(candidate.logs)) return null

  const logsValid = candidate.logs.every((log) => {
    if (!isObject(log)) return false
    const entry = log as Partial<AuditLogEntry>
    return (
      typeof entry.t === 'string' &&
      typeof entry.action === 'string' &&
      typeof entry.resource === 'string' &&
      typeof entry.user === 'string' &&
      typeof entry.success === 'boolean'
    )
  })

  if (!logsValid) return null

  return {
    success: true,
    logs: candidate.logs as AuditLogEntry[],
    count: typeof candidate.count === 'number' ? candidate.count : candidate.logs.length,
    timestamp: candidate.timestamp
  }
}
