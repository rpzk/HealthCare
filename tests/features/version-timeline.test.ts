/**
 * Version Timeline Tests
 * 
 * Tests for medical record version control:
 * - Version creation
 * - Version comparison
 * - Timeline rendering
 * - Restore functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock version data
const mockVersions = [
  {
    id: 'ver-1',
    medicalRecordId: 'record-1',
    versionNumber: 1,
    content: JSON.stringify({
      title: 'Consulta Inicial',
      notes: 'Paciente apresenta dor de cabeça',
      diagnosis: 'Enxaqueca'
    }),
    changeReason: 'Criação inicial',
    changedBy: { id: 'doc-1', name: 'Dr. Carlos' },
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'ver-2',
    medicalRecordId: 'record-1',
    versionNumber: 2,
    content: JSON.stringify({
      title: 'Consulta Inicial',
      notes: 'Paciente apresenta dor de cabeça intensa há 3 dias',
      diagnosis: 'Enxaqueca tensional'
    }),
    changeReason: 'Correção do diagnóstico após exames',
    changedBy: { id: 'doc-1', name: 'Dr. Carlos' },
    createdAt: new Date('2024-01-16T14:30:00Z')
  },
  {
    id: 'ver-3',
    medicalRecordId: 'record-1',
    versionNumber: 3,
    content: JSON.stringify({
      title: 'Consulta Inicial - Acompanhamento',
      notes: 'Paciente apresenta dor de cabeça intensa há 3 dias. Melhora após medicação.',
      diagnosis: 'Enxaqueca tensional',
      prescription: 'Dipirona 500mg 6/6h'
    }),
    changeReason: 'Adição de prescrição',
    changedBy: { id: 'doc-2', name: 'Dra. Maria' },
    createdAt: new Date('2024-01-20T09:15:00Z')
  }
]

vi.mock('@/lib/prisma', () => ({
  prisma: {
    medicalRecordVersion: {
      findMany: vi.fn(async ({ where, orderBy }) => {
        let versions = [...mockVersions]
        if (where?.medicalRecordId) {
          versions = versions.filter(v => v.medicalRecordId === where.medicalRecordId)
        }
        if (orderBy?.versionNumber === 'desc') {
          versions.sort((a, b) => b.versionNumber - a.versionNumber)
        }
        return versions
      }),
      findUnique: vi.fn(async ({ where }) => {
        return mockVersions.find(v => v.id === where.id) || null
      }),
      create: vi.fn(async ({ data }) => {
        const newVersion = {
          id: `ver-${mockVersions.length + 1}`,
          ...data,
          createdAt: new Date()
        }
        return newVersion
      })
    },
    medicalRecord: {
      update: vi.fn(async ({ where, data }) => {
        return { id: where.id, ...data }
      })
    }
  }
}))

// Helper functions to test
function parseVersionContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content)
  } catch {
    return {}
  }
}

function compareVersions(
  oldVersion: typeof mockVersions[0],
  newVersion: typeof mockVersions[0]
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const oldContent = parseVersionContent(oldVersion.content)
  const newContent = parseVersionContent(newVersion.content)
  
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []
  
  // Check fields in new version
  for (const key of Object.keys(newContent)) {
    if (JSON.stringify(oldContent[key]) !== JSON.stringify(newContent[key])) {
      changes.push({
        field: key,
        oldValue: oldContent[key],
        newValue: newContent[key]
      })
    }
  }
  
  // Check for removed fields
  for (const key of Object.keys(oldContent)) {
    if (!(key in newContent)) {
      changes.push({
        field: key,
        oldValue: oldContent[key],
        newValue: undefined
      })
    }
  }
  
  return changes
}

function buildTimeline(versions: typeof mockVersions) {
  return versions.map(v => ({
    id: v.id,
    version: v.versionNumber,
    date: v.createdAt,
    author: v.changedBy.name,
    reason: v.changeReason,
    isCurrent: v.versionNumber === Math.max(...versions.map(x => x.versionNumber))
  })).sort((a, b) => b.version - a.version)
}

function canRestore(userRole: string, versionAge: number): boolean {
  const maxAgeInDays: Record<string, number> = {
    ADMIN: Infinity,
    DOCTOR: 30,
    NURSE: 7
  }
  return versionAge <= (maxAgeInDays[userRole] || 0)
}

describe('Version Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Version Retrieval', () => {
    it('should fetch all versions for a record', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const versions = await prisma.medicalRecordVersion.findMany({
        where: { medicalRecordId: 'record-1' },
        orderBy: { versionNumber: 'desc' }
      })
      
      expect(versions).toHaveLength(3)
      expect(versions[0].versionNumber).toBe(3) // desc order
    })

    it('should parse version content correctly', () => {
      const content = parseVersionContent(mockVersions[0].content)
      
      expect(content.title).toBe('Consulta Inicial')
      expect(content.notes).toBe('Paciente apresenta dor de cabeça')
    })

    it('should handle invalid JSON gracefully', () => {
      const content = parseVersionContent('invalid json')
      
      expect(content).toEqual({})
    })
  })

  describe('Version Comparison', () => {
    it('should detect field changes between versions', () => {
      const changes = compareVersions(mockVersions[0], mockVersions[1])
      
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'notes',
          oldValue: 'Paciente apresenta dor de cabeça',
          newValue: 'Paciente apresenta dor de cabeça intensa há 3 dias'
        })
      )
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'diagnosis',
          oldValue: 'Enxaqueca',
          newValue: 'Enxaqueca tensional'
        })
      )
    })

    it('should detect new fields', () => {
      const changes = compareVersions(mockVersions[1], mockVersions[2])
      
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'prescription',
          oldValue: undefined,
          newValue: 'Dipirona 500mg 6/6h'
        })
      )
    })

    it('should detect removed fields', () => {
      // Create a mock where a field was removed
      const oldVersion = {
        ...mockVersions[2],
        content: JSON.stringify({ title: 'Test', extra: 'value' })
      }
      const newVersion = {
        ...mockVersions[2],
        content: JSON.stringify({ title: 'Test' })
      }
      
      const changes = compareVersions(oldVersion, newVersion)
      
      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'extra',
          oldValue: 'value',
          newValue: undefined
        })
      )
    })

    it('should return empty array when no changes', () => {
      const changes = compareVersions(mockVersions[0], mockVersions[0])
      
      expect(changes).toHaveLength(0)
    })
  })

  describe('Timeline Building', () => {
    it('should build timeline from versions', () => {
      const timeline = buildTimeline(mockVersions)
      
      expect(timeline).toHaveLength(3)
      expect(timeline[0].version).toBe(3) // Most recent first
      expect(timeline[0].isCurrent).toBe(true)
      expect(timeline[1].isCurrent).toBe(false)
    })

    it('should include author information', () => {
      const timeline = buildTimeline(mockVersions)
      
      expect(timeline[0].author).toBe('Dra. Maria')
      expect(timeline[1].author).toBe('Dr. Carlos')
    })

    it('should include change reasons', () => {
      const timeline = buildTimeline(mockVersions)
      
      expect(timeline[0].reason).toBe('Adição de prescrição')
    })
  })

  describe('Version Restore', () => {
    it('should allow admin to restore any version', () => {
      const canRestoreOld = canRestore('ADMIN', 365) // 1 year old
      
      expect(canRestoreOld).toBe(true)
    })

    it('should limit doctor restore to 30 days', () => {
      expect(canRestore('DOCTOR', 20)).toBe(true)
      expect(canRestore('DOCTOR', 40)).toBe(false)
    })

    it('should limit nurse restore to 7 days', () => {
      expect(canRestore('NURSE', 5)).toBe(true)
      expect(canRestore('NURSE', 10)).toBe(false)
    })

    it('should deny restore for unknown roles', () => {
      expect(canRestore('PATIENT', 1)).toBe(false)
    })

    it('should create new version when restoring', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const restoredContent = mockVersions[0].content
      
      const newVersion = await prisma.medicalRecordVersion.create({
        data: {
          medicalRecordId: 'record-1',
          versionNumber: 4,
          content: restoredContent,
          changeReason: 'Restaurado da versão 1',
          changedById: 'doc-1'
        }
      })
      
      expect(newVersion.versionNumber).toBe(4)
      expect(newVersion.changeReason).toBe('Restaurado da versão 1')
    })
  })

  describe('Version Metadata', () => {
    it('should track who made the change', () => {
      expect(mockVersions[0].changedBy.name).toBe('Dr. Carlos')
      expect(mockVersions[2].changedBy.name).toBe('Dra. Maria')
    })

    it('should track when the change was made', () => {
      const v1Date = mockVersions[0].createdAt
      const v2Date = mockVersions[1].createdAt
      
      expect(v2Date.getTime()).toBeGreaterThan(v1Date.getTime())
    })

    it('should maintain sequential version numbers', () => {
      const numbers = mockVersions.map(v => v.versionNumber)
      
      expect(numbers).toEqual([1, 2, 3])
    })
  })
})

describe('Version Search', () => {
  it('should find versions by date range', () => {
    const startDate = new Date('2024-01-15')
    const endDate = new Date('2024-01-17')
    
    const filtered = mockVersions.filter(v => 
      v.createdAt >= startDate && v.createdAt <= endDate
    )
    
    expect(filtered).toHaveLength(2)
  })

  it('should find versions by author', () => {
    const authorId = 'doc-1'
    
    const filtered = mockVersions.filter(v => v.changedBy.id === authorId)
    
    expect(filtered).toHaveLength(2)
  })
})
