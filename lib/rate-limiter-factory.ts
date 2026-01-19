/**
 * Rate Limiter Factory
 * 
 * Factory Pattern para seleção automática da implementação de rate limiting
 * baseada no ambiente e disponibilidade do Redis.
 * 
 * - Produção: Usa Redis (distribuído entre múltiplas instâncias)
 * - Desenvolvimento: Fallback para in-memory (mais simples)
 */

import { logger } from './logger'

export interface RateLimitConfig {
  windowMs: number  // Janela de tempo em ms
  maxRequests: number  // Máximo de requisições na janela
  keyPrefix?: string  // Prefixo para as chaves (opcional)
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

export interface RateLimiterImplementation {
  name: string
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>
  reset(key: string): Promise<void>
  isHealthy(): Promise<boolean>
}

/**
 * Redis Rate Limiter (Production)
 * Usa algoritmo sliding window com Redis
 */
class RedisRateLimiter implements RateLimiterImplementation {
  name = 'Redis (Distributed)'
  private redis: any
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    try {
      const Redis = (await import('ioredis')).default
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times: number) => {
          if (times > 3) return null // Stop retrying after 3 attempts
          return Math.min(times * 100, 1000)
        }
      })

      this.redis.on('error', (err: Error) => {
        logger.error({ error: err }, 'Redis rate limiter error')
      })

      await this.redis.ping()
      this.isInitialized = true
      logger.info('Redis rate limiter initialized')
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Redis rate limiter')
      throw error
    }
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    await this.initialize()

    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      // Use Redis sorted set with timestamp as score
      const pipeline = this.redis.pipeline()
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(fullKey, 0, windowStart)
      
      // Count current entries in window
      pipeline.zcard(fullKey)
      
      // Add current request
      pipeline.zadd(fullKey, now, `${now}-${Math.random()}`)
      
      // Set expiry on key
      pipeline.expire(fullKey, Math.ceil(config.windowMs / 1000))

      const results = await pipeline.exec()
      
      if (!results) {
        throw new Error('Pipeline execution failed')
      }

      // Count is in results[1][1] (second command result)
      const count = results[1][1] as number

      const allowed = count < config.maxRequests
      const remaining = Math.max(0, config.maxRequests - count - 1)
      const resetAt = new Date(now + config.windowMs)

      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        resetAt
      }
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Rate limit check failed')
      
      // Fail open - allow request on error
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now + config.windowMs)
      }
    }
  }

  async reset(key: string): Promise<void> {
    await this.initialize()
    
    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error({ error, key }, 'Failed to reset rate limit')
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.initialize()
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

/**
 * In-Memory Rate Limiter (Development Fallback)
 * Usa Map local - não funciona em ambiente distribuído
 */
class InMemoryRateLimiter implements RateLimiterImplementation {
  name = 'In-Memory (Single Instance)'
  private store = new Map<string, { requests: number[], firstRequest: number }>()

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key
    const now = Date.now()
    const windowStart = now - config.windowMs

    let record = this.store.get(fullKey)

    // Clean old records periodically
    if (Math.random() < 0.01) {
      this.cleanupOldRecords()
    }

    if (!record) {
      record = { requests: [now], firstRequest: now }
      this.store.set(fullKey, record)
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now + config.windowMs)
      }
    }

    // Filter requests within window
    record.requests = record.requests.filter(timestamp => timestamp > windowStart)
    
    const count = record.requests.length
    const allowed = count < config.maxRequests

    if (allowed) {
      record.requests.push(now)
    }

    const remaining = Math.max(0, config.maxRequests - count - 1)
    const oldestRequest = record.requests[0] || now
    const resetAt = new Date(oldestRequest + config.windowMs)

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetAt
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async isHealthy(): Promise<boolean> {
    return true
  }

  private cleanupOldRecords() {
    const cutoff = Date.now() - (60 * 60 * 1000) // 1 hour ago
    
    for (const [key, record] of this.store.entries()) {
      if (record.firstRequest < cutoff) {
        this.store.delete(key)
      }
    }
  }
}

/**
 * Rate Limiter Factory
 * Seleciona automaticamente a melhor implementação disponível
 */
export class RateLimiterFactory {
  private static instance: RateLimiterImplementation | null = null
  private static initializationPromise: Promise<RateLimiterImplementation> | null = null

  /**
   * Obtém a implementação de rate limiter apropriada
   */
  static async getRateLimiter(): Promise<RateLimiterImplementation> {
    if (this.instance) {
      return this.instance
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.initializeRateLimiter()
    this.instance = await this.initializationPromise
    this.initializationPromise = null

    return this.instance
  }

  private static async initializeRateLimiter(): Promise<RateLimiterImplementation> {
    const env = process.env.NODE_ENV || 'development'
    const redisHost = process.env.REDIS_HOST
    const forceInMemory = process.env.RATE_LIMITER_FORCE_MEMORY === 'true'

    logger.info({ 
      env, 
      redisHost: redisHost || 'not configured',
      forceInMemory 
    }, 'Initializing rate limiter')

    if (forceInMemory) {
      logger.info('Using in-memory rate limiter (forced by environment)')
      return new InMemoryRateLimiter()
    }

    // Try Redis in production or when Redis is configured
    if (env === 'production' || redisHost) {
      try {
        const redisLimiter = new RedisRateLimiter()
        const isHealthy = await redisLimiter.isHealthy()
        
        if (isHealthy) {
          logger.info('Using Redis rate limiter (production mode)')
          return redisLimiter
        } else {
          logger.warn('Redis rate limiter unhealthy, falling back to in-memory')
        }
      } catch (error) {
        logger.error({ error }, 'Redis rate limiter initialization failed, falling back to in-memory')
      }
    }

    logger.info('Using in-memory rate limiter (development mode)')
    return new InMemoryRateLimiter()
  }

  /**
   * Force reset (for testing)
   */
  static reset() {
    this.instance = null
    this.initializationPromise = null
  }

  /**
   * Get rate limiter info
   */
  static async getRateLimiterInfo() {
    const limiter = await this.getRateLimiter()
    const healthy = await limiter.isHealthy()
    
    return {
      name: limiter.name,
      healthy,
      environment: process.env.NODE_ENV || 'development',
      redisConfigured: !!process.env.REDIS_HOST
    }
  }
}

/**
 * Helper function - check rate limit using factory
 */
export async function checkRateLimit(
  key: string, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = await RateLimiterFactory.getRateLimiter()
  return limiter.check(key, config)
}

/**
 * Helper function - reset rate limit for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const limiter = await RateLimiterFactory.getRateLimiter()
  return limiter.reset(key)
}

/**
 * Preset configurations for common use cases
 */
export const RateLimitPresets = {
  // 100 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 100
  },
  // 300 requests per minute (current default)
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 300
  },
  // 1000 requests per minute
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 1000
  },
  // 10 requests per hour (for sensitive operations)
  sensitive: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10
  }
}

// Export for backwards compatibility
export { RateLimiterFactory as default }
