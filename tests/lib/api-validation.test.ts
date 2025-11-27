import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  paginationSchema,
  idParamSchema,
  searchSchema,
  dateRangeSchema,
} from '@/lib/api-validation'

describe('API Validation Schemas', () => {
  describe('paginationSchema', () => {
    it('should use defaults when no params provided', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.sortOrder).toBe('desc')
      }
    })

    it('should coerce string numbers to integers', () => {
      const result = paginationSchema.safeParse({ page: '5', limit: '50' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject negative page numbers', () => {
      const result = paginationSchema.safeParse({ page: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: 200 })
      expect(result.success).toBe(false)
    })

    it('should only accept valid sort orders', () => {
      const validAsc = paginationSchema.safeParse({ sortOrder: 'asc' })
      expect(validAsc.success).toBe(true)
      
      const validDesc = paginationSchema.safeParse({ sortOrder: 'desc' })
      expect(validDesc.success).toBe(true)
      
      const invalid = paginationSchema.safeParse({ sortOrder: 'random' })
      expect(invalid.success).toBe(false)
    })
  })

  describe('idParamSchema', () => {
    it('should accept valid CUID', () => {
      const result = idParamSchema.safeParse({ id: 'clx123abc456def789ghi' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid IDs', () => {
      const result = idParamSchema.safeParse({ id: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject empty IDs', () => {
      const result = idParamSchema.safeParse({ id: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('searchSchema', () => {
    it('should accept valid search term', () => {
      const result = searchSchema.safeParse({ q: 'diabetes' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10) // default
      }
    })

    it('should reject empty search term', () => {
      const result = searchSchema.safeParse({ q: '' })
      expect(result.success).toBe(false)
    })

    it('should reject overly long search terms', () => {
      const result = searchSchema.safeParse({ q: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('should accept custom limit', () => {
      const result = searchSchema.safeParse({ q: 'test', limit: 25 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
      }
    })
  })

  describe('dateRangeSchema', () => {
    it('should accept empty range', () => {
      const result = dateRangeSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid date range', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('should accept same start and end date', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-06-15T00:00:00.000Z',
        endDate: '2024-06-15T23:59:59.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('should reject end date before start date', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-12-31T00:00:00.000Z',
        endDate: '2024-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('should accept only start date', () => {
      const result = dateRangeSchema.safeParse({
        startDate: '2024-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('should accept only end date', () => {
      const result = dateRangeSchema.safeParse({
        endDate: '2024-12-31T00:00:00.000Z',
      })
      expect(result.success).toBe(true)
    })
  })
})
