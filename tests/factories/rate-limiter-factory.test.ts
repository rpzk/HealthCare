/**
 * Rate Limiter Factory Tests
 * 
 * Tests for RateLimiterFactory including:
 * - Rate limiter factory initialization
 * - Redis rate limiter selection (production)
 * - In-memory rate limiter fallback (development)
 * - Rate limit checking
 * - Rate limit reset
 * - Preset configurations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  RateLimiterFactory, 
  checkRateLimit, 
  resetRateLimit,
  RateLimitPresets 
} from '@/lib/rate-limiter-factory'

// Mock ioredis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    ping: vi.fn(async () => 'PONG'),
    pipeline: vi.fn(() => ({
      zremrangebyscore: vi.fn(function() { return this }),
      zcard: vi.fn(function() { return this }),
      zadd: vi.fn(function() { return this }),
      expire: vi.fn(function() { return this }),
      exec: vi.fn(async () => [
        [null, 0],
        [null, 2],
        [null, 'OK'],
        [null, 1]
      ])
    })),
    del: vi.fn(async () => 1),
    quit: vi.fn(async () => 'OK')
  }))
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('RateLimiterFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    RateLimiterFactory.reset()
  })

  afterEach(() => {
    RateLimiterFactory.reset()
  })

  describe('getRateLimiter', () => {
    it('should return a rate limiter instance', async () => {
      const limiter = await RateLimiterFactory.getRateLimiter()
      expect(limiter).toBeDefined()
      expect(limiter.name).toBeDefined()
    })

    it('should return in-memory limiter in development', async () => {
      process.env.RATE_LIMITER_FORCE_MEMORY = 'true'

      const limiter = await RateLimiterFactory.getRateLimiter()
      
      expect(limiter.name).toContain('In-Memory')

      delete process.env.RATE_LIMITER_FORCE_MEMORY
    })

    it('should cache limiter instance', async () => {
      const limiter1 = await RateLimiterFactory.getRateLimiter()
      const limiter2 = await RateLimiterFactory.getRateLimiter()
      
      expect(limiter1).toBe(limiter2)
    })

    it('should handle multiple concurrent requests', async () => {
      const limiters = await Promise.all([
        RateLimiterFactory.getRateLimiter(),
        RateLimiterFactory.getRateLimiter(),
        RateLimiterFactory.getRateLimiter()
      ])
      
      expect(limiters[0]).toBe(limiters[1])
      expect(limiters[1]).toBe(limiters[2])
    })
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await checkRateLimit('test-user-1', RateLimitPresets.standard)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
      expect(result.limit).toBe(300)
    })

    it('should track remaining requests', async () => {
      process.env.RATE_LIMITER_FORCE_MEMORY = 'true'
      RateLimiterFactory.reset()

      const result1 = await checkRateLimit('test-key-1', {
        windowMs: 1000,
        maxRequests: 3
      })

      expect(result1.remaining).toBe(2)

      const result2 = await checkRateLimit('test-key-1', {
        windowMs: 1000,
        maxRequests: 3
      })

      expect(result2.remaining).toBe(1)

      delete process.env.RATE_LIMITER_FORCE_MEMORY
      RateLimiterFactory.reset()
    })

    it('should reset limit after window expires', async () => {
      process.env.RATE_LIMITER_FORCE_MEMORY = 'true'
      RateLimiterFactory.reset()

      // Max out within first window
      for (let i = 0; i < 2; i++) {
        await checkRateLimit('test-key-2', {
          windowMs: 100,
          maxRequests: 2
        })
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should allow new requests in new window
      const result = await checkRateLimit('test-key-2', {
        windowMs: 100,
        maxRequests: 2
      })

      expect(result.remaining).toBeGreaterThan(0)

      delete process.env.RATE_LIMITER_FORCE_MEMORY
      RateLimiterFactory.reset()
    })

    it('should use keyPrefix when provided', async () => {
      const result = await checkRateLimit('user-123', {
        ...RateLimitPresets.standard,
        keyPrefix: 'api'
      })

      expect(result.allowed).toBeTypeOf('boolean')
    })

    it('should return correct reset time', async () => {
      const result = await checkRateLimit('test-key', RateLimitPresets.standard)
      
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for a key', async () => {
      await expect(resetRateLimit('test-key')).resolves.not.toThrow()
    })

    it('should allow new requests after reset', async () => {
      process.env.RATE_LIMITER_FORCE_MEMORY = 'true'
      RateLimiterFactory.reset()

      const config = { windowMs: 1000, maxRequests: 1 }

      // Use up limit
      await checkRateLimit('test-key-3', config)
      const result1 = await checkRateLimit('test-key-3', config)
      expect(result1.remaining).toBe(0)

      // Reset
      await resetRateLimit('test-key-3')

      // Should allow again
      const result2 = await checkRateLimit('test-key-3', config)
      expect(result2.remaining).toBeGreaterThan(0)

      delete process.env.RATE_LIMITER_FORCE_MEMORY
      RateLimiterFactory.reset()
    })
  })

  describe('RateLimitPresets', () => {
    it('should have strict preset', () => {
      expect(RateLimitPresets.strict.maxRequests).toBeLessThan(RateLimitPresets.standard.maxRequests)
    })

    it('should have standard preset', () => {
      expect(RateLimitPresets.standard.maxRequests).toBe(300)
    })

    it('should have relaxed preset', () => {
      expect(RateLimitPresets.relaxed.maxRequests).toBeGreaterThan(RateLimitPresets.standard.maxRequests)
    })

    it('should have sensitive preset with longer window', () => {
      expect(RateLimitPresets.sensitive.windowMs).toBeGreaterThan(RateLimitPresets.standard.windowMs)
      expect(RateLimitPresets.sensitive.maxRequests).toBeLessThan(RateLimitPresets.standard.maxRequests)
    })
  })

  describe('getRateLimiterInfo', () => {
    it('should return rate limiter information', async () => {
      const info = await RateLimiterFactory.getRateLimiterInfo()
      
      expect(info.name).toBeDefined()
      expect(info.healthy).toBeTypeOf('boolean')
      expect(info.environment).toBeDefined()
      expect(info.redisConfigured).toBeTypeOf('boolean')
    })
  })

  describe('InMemoryRateLimiter implementation', () => {
    beforeEach(() => {
      process.env.RATE_LIMITER_FORCE_MEMORY = 'true'
      RateLimiterFactory.reset()
    })

    afterEach(() => {
      delete process.env.RATE_LIMITER_FORCE_MEMORY
      RateLimiterFactory.reset()
    })

    it('should track multiple keys independently', async () => {
      const config = { windowMs: 1000, maxRequests: 2 }

      const result1 = await checkRateLimit('key-1', config)
      const result2 = await checkRateLimit('key-2', config)

      expect(result1.remaining).toBe(1)
      expect(result2.remaining).toBe(1)
    })

    it('should be healthy always', async () => {
      const limiter = await RateLimiterFactory.getRateLimiter()
      const healthy = await limiter.isHealthy()

      expect(healthy).toBe(true)
    })

    it('should handle high request volume', async () => {
      const config = { windowMs: 1000, maxRequests: 100 }

      let blockedAt = 0
      for (let i = 0; i < 150; i++) {
        const result = await checkRateLimit('volume-test', config)
        if (!result.allowed) {
          blockedAt = i
          break
        }
      }

      expect(blockedAt).toBe(100)
    })
  })
})
