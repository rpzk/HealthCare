import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CacheService, CacheKeys, CacheTTL } from '@/lib/cache-service'

describe('CacheService', () => {
  beforeEach(() => {
    CacheService.clear()
  })

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      CacheService.set('test-key', { data: 'test-value' })
      const result = CacheService.get('test-key')
      expect(result).toEqual({ data: 'test-value' })
    })

    it('should return undefined for non-existent keys', () => {
      const result = CacheService.get('non-existent')
      expect(result).toBeUndefined()
    })

    it('should expire entries after TTL', async () => {
      CacheService.set('expiring-key', 'value', 50) // 50ms TTL
      
      // Should exist immediately
      expect(CacheService.get('expiring-key')).toBe('value')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(CacheService.get('expiring-key')).toBeUndefined()
    })
  })

  describe('getOrSet', () => {
    it('should return cached value without calling function', async () => {
      CacheService.set('cached', 'cached-value')
      
      const fn = vi.fn().mockResolvedValue('new-value')
      const result = await CacheService.getOrSet('cached', fn)
      
      expect(result).toBe('cached-value')
      expect(fn).not.toHaveBeenCalled()
    })

    it('should call function and cache result when not cached', async () => {
      const fn = vi.fn().mockResolvedValue('computed-value')
      const result = await CacheService.getOrSet('not-cached', fn)
      
      expect(result).toBe('computed-value')
      expect(fn).toHaveBeenCalledTimes(1)
      
      // Should be cached now
      const cached = CacheService.get('not-cached')
      expect(cached).toBe('computed-value')
    })
  })

  describe('delete', () => {
    it('should remove a specific key', () => {
      CacheService.set('to-delete', 'value')
      expect(CacheService.get('to-delete')).toBe('value')
      
      CacheService.delete('to-delete')
      expect(CacheService.get('to-delete')).toBeUndefined()
    })
  })

  describe('deleteByPrefix', () => {
    it('should remove all keys with prefix', () => {
      CacheService.set('prefix:key1', 'value1')
      CacheService.set('prefix:key2', 'value2')
      CacheService.set('other:key', 'value3')
      
      const count = CacheService.deleteByPrefix('prefix:')
      
      expect(count).toBe(2)
      expect(CacheService.get('prefix:key1')).toBeUndefined()
      expect(CacheService.get('prefix:key2')).toBeUndefined()
      expect(CacheService.get('other:key')).toBe('value3')
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      CacheService.set('key1', 'value1')
      CacheService.set('key2', 'value2')
      
      CacheService.clear()
      
      expect(CacheService.get('key1')).toBeUndefined()
      expect(CacheService.get('key2')).toBeUndefined()
      expect(CacheService.stats().size).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      CacheService.set('short', 'value', 50)
      CacheService.set('long', 'value', 10000)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const count = CacheService.cleanup()
      
      expect(count).toBe(1)
      expect(CacheService.get('short')).toBeUndefined()
      expect(CacheService.get('long')).toBe('value')
    })
  })

  describe('stats', () => {
    it('should return cache statistics', () => {
      CacheService.set('key1', 'value1')
      CacheService.set('key2', 'value2')
      
      const stats = CacheService.stats()
      
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })
})

describe('CacheKeys', () => {
  it('should generate consistent keys', () => {
    expect(CacheKeys.medicalCodes('CID10')).toBe('codes:CID10')
    expect(CacheKeys.codeSearch('CID10', 'diabetes')).toBe('codes:CID10:search:diabetes')
    expect(CacheKeys.medicationSearch('paracetamol')).toBe('meds:search:paracetamol')
    expect(CacheKeys.dashboardStats('user123')).toBe('dashboard:user123')
    expect(CacheKeys.protocols()).toBe('protocols:all')
    expect(CacheKeys.protocols('DIABETES')).toBe('protocols:DIABETES')
  })
})

describe('CacheTTL', () => {
  it('should have correct TTL values', () => {
    expect(CacheTTL.SHORT).toBe(30 * 1000)
    expect(CacheTTL.MEDIUM).toBe(5 * 60 * 1000)
    expect(CacheTTL.LONG).toBe(30 * 60 * 1000)
    expect(CacheTTL.VERY_LONG).toBe(60 * 60 * 1000)
  })
})
