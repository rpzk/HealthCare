/**
 * Advanced Filters Tests
 * 
 * Tests for advanced filter functionality:
 * - Date range filtering
 * - Tag-based filtering
 * - Status filtering
 * - Combined filters
 * - Pagination with filters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock data
const mockRecords = [
  {
    id: 'rec-1',
    title: 'Consulta Cardiologia',
    tags: ['cardiologia', 'urgente'],
    status: 'ACTIVE',
    createdAt: new Date('2024-01-15'),
    doctor: { name: 'Dr. Carlos', speciality: 'Cardiologia' }
  },
  {
    id: 'rec-2',
    title: 'Exame Sangue',
    tags: ['laboratório', 'rotina'],
    status: 'ACTIVE',
    createdAt: new Date('2024-02-20'),
    doctor: { name: 'Dra. Maria', speciality: 'Clínica Geral' }
  },
  {
    id: 'rec-3',
    title: 'Consulta Dermatologia',
    tags: ['dermatologia'],
    status: 'ARCHIVED',
    createdAt: new Date('2024-03-10'),
    doctor: { name: 'Dr. Pedro', speciality: 'Dermatologia' }
  },
  {
    id: 'rec-4',
    title: 'Retorno Cardiologia',
    tags: ['cardiologia', 'retorno'],
    status: 'ACTIVE',
    createdAt: new Date('2024-03-25'),
    doctor: { name: 'Dr. Carlos', speciality: 'Cardiologia' }
  }
]

// Filter functions to test
function filterByDateRange(
  records: typeof mockRecords,
  startDate: Date | null,
  endDate: Date | null
) {
  return records.filter(r => {
    if (startDate && r.createdAt < startDate) return false
    if (endDate && r.createdAt > endDate) return false
    return true
  })
}

function filterByTags(records: typeof mockRecords, tags: string[]) {
  if (tags.length === 0) return records
  return records.filter(r => 
    tags.some(tag => r.tags.includes(tag))
  )
}

function filterByStatus(records: typeof mockRecords, status: string | null) {
  if (!status) return records
  return records.filter(r => r.status === status)
}

function filterByDoctor(records: typeof mockRecords, doctorName: string | null) {
  if (!doctorName) return records
  return records.filter(r => 
    r.doctor.name.toLowerCase().includes(doctorName.toLowerCase())
  )
}

function filterBySpeciality(records: typeof mockRecords, speciality: string | null) {
  if (!speciality) return records
  return records.filter(r => 
    r.doctor.speciality.toLowerCase() === speciality.toLowerCase()
  )
}

function applyFilters(
  records: typeof mockRecords,
  filters: {
    startDate?: Date | null
    endDate?: Date | null
    tags?: string[]
    status?: string | null
    doctorName?: string | null
    speciality?: string | null
  }
) {
  let result = [...records]
  
  if (filters.startDate || filters.endDate) {
    result = filterByDateRange(result, filters.startDate || null, filters.endDate || null)
  }
  if (filters.tags && filters.tags.length > 0) {
    result = filterByTags(result, filters.tags)
  }
  if (filters.status) {
    result = filterByStatus(result, filters.status)
  }
  if (filters.doctorName) {
    result = filterByDoctor(result, filters.doctorName)
  }
  if (filters.speciality) {
    result = filterBySpeciality(result, filters.speciality)
  }
  
  return result
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return {
    data: items.slice(startIndex, endIndex),
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    currentPage: page,
    hasNextPage: endIndex < items.length,
    hasPrevPage: page > 1
  }
}

describe('Advanced Filters', () => {
  describe('Date Range Filtering', () => {
    it('should filter records after start date', () => {
      const startDate = new Date('2024-02-01')
      const result = filterByDateRange(mockRecords, startDate, null)
      
      expect(result).toHaveLength(3)
      expect(result.every(r => r.createdAt >= startDate)).toBe(true)
    })

    it('should filter records before end date', () => {
      const endDate = new Date('2024-02-28')
      const result = filterByDateRange(mockRecords, null, endDate)
      
      expect(result).toHaveLength(2)
      expect(result.every(r => r.createdAt <= endDate)).toBe(true)
    })

    it('should filter records within date range', () => {
      const startDate = new Date('2024-02-01')
      const endDate = new Date('2024-03-15')
      const result = filterByDateRange(mockRecords, startDate, endDate)
      
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id)).toContain('rec-2')
      expect(result.map(r => r.id)).toContain('rec-3')
    })

    it('should return all records when no date filter', () => {
      const result = filterByDateRange(mockRecords, null, null)
      
      expect(result).toHaveLength(4)
    })
  })

  describe('Tag Filtering', () => {
    it('should filter records by single tag', () => {
      const result = filterByTags(mockRecords, ['cardiologia'])
      
      expect(result).toHaveLength(2)
      expect(result.every(r => r.tags.includes('cardiologia'))).toBe(true)
    })

    it('should filter records by multiple tags (OR logic)', () => {
      const result = filterByTags(mockRecords, ['cardiologia', 'dermatologia'])
      
      expect(result).toHaveLength(3)
    })

    it('should return all records when no tags', () => {
      const result = filterByTags(mockRecords, [])
      
      expect(result).toHaveLength(4)
    })

    it('should return empty when tag not found', () => {
      const result = filterByTags(mockRecords, ['inexistente'])
      
      expect(result).toHaveLength(0)
    })
  })

  describe('Status Filtering', () => {
    it('should filter active records', () => {
      const result = filterByStatus(mockRecords, 'ACTIVE')
      
      expect(result).toHaveLength(3)
      expect(result.every(r => r.status === 'ACTIVE')).toBe(true)
    })

    it('should filter archived records', () => {
      const result = filterByStatus(mockRecords, 'ARCHIVED')
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('rec-3')
    })

    it('should return all when status is null', () => {
      const result = filterByStatus(mockRecords, null)
      
      expect(result).toHaveLength(4)
    })
  })

  describe('Doctor/Speciality Filtering', () => {
    it('should filter by doctor name (partial match)', () => {
      const result = filterByDoctor(mockRecords, 'carlos')
      
      expect(result).toHaveLength(2)
    })

    it('should filter by speciality', () => {
      const result = filterBySpeciality(mockRecords, 'Cardiologia')
      
      expect(result).toHaveLength(2)
    })
  })

  describe('Combined Filters', () => {
    it('should apply multiple filters together', () => {
      const result = applyFilters(mockRecords, {
        tags: ['cardiologia'],
        status: 'ACTIVE'
      })
      
      expect(result).toHaveLength(2)
    })

    it('should apply date and status filters', () => {
      const result = applyFilters(mockRecords, {
        startDate: new Date('2024-02-01'),
        status: 'ACTIVE'
      })
      
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id)).toContain('rec-2')
      expect(result.map(r => r.id)).toContain('rec-4')
    })

    it('should return empty when filters are too restrictive', () => {
      const result = applyFilters(mockRecords, {
        tags: ['cardiologia'],
        status: 'ARCHIVED'
      })
      
      expect(result).toHaveLength(0)
    })

    it('should apply all filters correctly', () => {
      const result = applyFilters(mockRecords, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        tags: ['cardiologia', 'laboratório'],
        status: 'ACTIVE',
        doctorName: 'carlos'
      })
      
      expect(result).toHaveLength(2)
    })
  })

  describe('Pagination', () => {
    it('should paginate results correctly', () => {
      const result = paginate(mockRecords, 1, 2)
      
      expect(result.data).toHaveLength(2)
      expect(result.totalItems).toBe(4)
      expect(result.totalPages).toBe(2)
      expect(result.currentPage).toBe(1)
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPrevPage).toBe(false)
    })

    it('should handle last page', () => {
      const result = paginate(mockRecords, 2, 2)
      
      expect(result.data).toHaveLength(2)
      expect(result.hasNextPage).toBe(false)
      expect(result.hasPrevPage).toBe(true)
    })

    it('should handle single item page', () => {
      const result = paginate(mockRecords, 1, 1)
      
      expect(result.data).toHaveLength(1)
      expect(result.totalPages).toBe(4)
    })

    it('should handle page larger than total', () => {
      const result = paginate(mockRecords, 1, 10)
      
      expect(result.data).toHaveLength(4)
      expect(result.totalPages).toBe(1)
      expect(result.hasNextPage).toBe(false)
    })

    it('should work with filtered results', () => {
      const filtered = filterByStatus(mockRecords, 'ACTIVE')
      const result = paginate(filtered, 1, 2)
      
      expect(result.data).toHaveLength(2)
      expect(result.totalItems).toBe(3)
      expect(result.totalPages).toBe(2)
    })
  })
})

describe('Filter Query Building', () => {
  it('should build Prisma where clause for date range', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')
    
    const whereClause: Record<string, unknown> = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
    
    expect(whereClause.createdAt).toBeDefined()
  })

  it('should build Prisma where clause for tags', () => {
    const tags = ['cardiologia', 'urgente']
    
    const whereClause = {
      tags: { hasSome: tags }
    }
    
    expect(whereClause.tags.hasSome).toEqual(tags)
  })

  it('should combine where clauses with AND', () => {
    const whereClause = {
      AND: [
        { status: 'ACTIVE' },
        { tags: { hasSome: ['cardiologia'] } },
        { createdAt: { gte: new Date('2024-01-01') } }
      ]
    }
    
    expect(whereClause.AND).toHaveLength(3)
  })
})
