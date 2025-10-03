export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface RateLimitStats {
  totalClients: number
  blockedClients: number
  totalRequests: number
}

export interface AuditSummary {
  totalRecent: number
  errors: number
  lastHour: number
}

export interface SecurityOverview {
  rateLimit: RateLimitStats
  audit: AuditSummary
  systemHealth: string
}

export interface SecurityOverviewResponse {
  success: boolean
  overview: SecurityOverview
  timestamp: string
}

export interface RedisRateLimiterStats {
  redisConnected: boolean
  totalKeys: number
  activeUsers: number
  blockedUsers: number
  memoryFallbackEntries: number
}

export interface RedisCacheStats {
  redisConnected: boolean
  memoryFallbackEntries: number
}

export interface RedisCombinedStats {
  rateLimiter: RedisRateLimiterStats
  cache: RedisCacheStats
}

export interface AuditLogEntry {
  t: string
  action: string
  resource: string
  success: boolean
  user: string
  err?: string | null
}

export interface AuditRecentResponse {
  success: boolean
  logs: AuditLogEntry[]
  count: number
  timestamp: string
}
