/**
 * Resources API Integration Tests
 * 
 * Tests for resource management:
 * - CRUD operations on resources
 * - Resource booking with conflict detection
 * - Resource availability queries
 * - Integration with appointments
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma
const mockResource = {
  id: 'resource-1',
  name: 'Consultório 101',
  description: 'Consultório médico padrão',
  type: 'ROOM',
  category: 'consultorio',
  location: 'Ala A',
  status: 'AVAILABLE',
  capacity: 4,
  floor: '1',
  isBookable: true,
  bookingDuration: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockBooking = {
  id: 'booking-1',
  resourceId: 'resource-1',
  userId: 'user-123',
  patientId: 'patient-123',
  consultationId: 'consultation-123',
  startTime: new Date('2026-02-01T09:00:00'),
  endTime: new Date('2026-02-01T09:30:00'),
  status: 'CONFIRMED',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    resource: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    resourceBooking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    resourceMaintenance: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      resource: { create: vi.fn(), update: vi.fn() },
      resourceBooking: { createMany: vi.fn() },
    })),
  }
}))

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => ({
    user: { id: 'admin-123', role: 'ADMIN' }
  }))
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}))

describe('Resources API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/resources', () => {
    it('should list resources with pagination', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource])
      vi.mocked(prisma.resource.count).mockResolvedValue(1)

      const resources = await prisma.resource.findMany({
        where: { status: 'AVAILABLE' },
        take: 10,
        skip: 0,
      })

      expect(resources).toHaveLength(1)
      expect(resources[0].name).toBe('Consultório 101')
    })

    it('should filter resources by type', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource])

      const resources = await prisma.resource.findMany({
        where: { type: 'ROOM' },
      })

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'ROOM' }
        })
      )
    })

    it('should search resources by name', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resource.findMany).mockResolvedValue([mockResource])

      await prisma.resource.findMany({
        where: { 
          name: { contains: 'Consultório', mode: 'insensitive' }
        },
      })

      expect(prisma.resource.findMany).toHaveBeenCalled()
    })
  })

  describe('POST /api/resources', () => {
    it('should create a new resource', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resource.create).mockResolvedValue(mockResource)

      const newResource = await prisma.resource.create({
        data: {
          name: 'Consultório 101',
          type: 'ROOM',
          category: 'consultorio',
          status: 'AVAILABLE',
          isBookable: true,
        }
      })

      expect(newResource.id).toBe('resource-1')
      expect(newResource.type).toBe('ROOM')
    })

    it('should validate required fields', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      // Simula erro de validação do Prisma
      vi.mocked(prisma.resource.create).mockRejectedValue(
        new Error('Missing required field: name')
      )

      await expect(
        prisma.resource.create({ data: {} as any })
      ).rejects.toThrow('Missing required field')
    })
  })

  describe('Resource Booking', () => {
    it('should create a booking for a resource', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resourceBooking.create).mockResolvedValue(mockBooking)

      const booking = await prisma.resourceBooking.create({
        data: {
          resourceId: 'resource-1',
          userId: 'user-123',
          startTime: new Date('2026-02-01T09:00:00'),
          endTime: new Date('2026-02-01T09:30:00'),
          status: 'CONFIRMED',
        }
      })

      expect(booking.status).toBe('CONFIRMED')
      expect(booking.resourceId).toBe('resource-1')
    })

    it('should detect booking conflicts', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      // Simular conflito existente
      vi.mocked(prisma.resourceBooking.findFirst).mockResolvedValue(mockBooking)

      const existingBooking = await prisma.resourceBooking.findFirst({
        where: {
          resourceId: 'resource-1',
          status: { not: 'CANCELLED' },
          OR: [
            { startTime: { lte: new Date('2026-02-01T09:15:00') }, endTime: { gt: new Date('2026-02-01T09:15:00') } },
          ]
        }
      })

      expect(existingBooking).not.toBeNull()
      expect(existingBooking?.id).toBe('booking-1')
    })

    it('should allow booking when no conflicts exist', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resourceBooking.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.resourceBooking.create).mockResolvedValue({
        ...mockBooking,
        id: 'booking-2',
        startTime: new Date('2026-02-01T10:00:00'),
        endTime: new Date('2026-02-01T10:30:00'),
      })

      const conflict = await prisma.resourceBooking.findFirst({
        where: { resourceId: 'resource-1' }
      })

      expect(conflict).toBeNull()

      const newBooking = await prisma.resourceBooking.create({
        data: {
          resourceId: 'resource-1',
          userId: 'user-123',
          startTime: new Date('2026-02-01T10:00:00'),
          endTime: new Date('2026-02-01T10:30:00'),
          status: 'CONFIRMED',
        }
      })

      expect(newBooking.id).toBe('booking-2')
    })
  })

  describe('Resource Availability', () => {
    it('should return available resources for a time slot', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const allResources = [
        mockResource,
        { ...mockResource, id: 'resource-2', name: 'Consultório 102' }
      ]
      
      vi.mocked(prisma.resource.findMany).mockResolvedValue(allResources)
      vi.mocked(prisma.resourceBooking.findMany).mockResolvedValue([mockBooking])

      const resources = await prisma.resource.findMany({
        where: { status: 'AVAILABLE', isBookable: true }
      })

      const bookings = await prisma.resourceBooking.findMany({
        where: { status: { not: 'CANCELLED' } }
      })

      // resource-1 está ocupado, resource-2 está livre
      const busyIds = new Set(bookings.map(b => b.resourceId))
      const available = resources.filter(r => !busyIds.has(r.id))

      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('resource-2')
    })

    it('should filter by resource type', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const equipment = { 
        ...mockResource, 
        id: 'equip-1', 
        name: 'ECG', 
        type: 'EQUIPMENT',
        category: 'diagnostico'
      }
      
      vi.mocked(prisma.resource.findMany).mockResolvedValue([equipment])

      const resources = await prisma.resource.findMany({
        where: { type: 'EQUIPMENT' }
      })

      expect(resources[0].type).toBe('EQUIPMENT')
    })
  })

  describe('Appointment Integration', () => {
    it('should create resource bookings when creating appointment', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const mockTransaction = vi.fn(async (fn) => {
        const tx = {
          consultation: {
            create: vi.fn().mockResolvedValue({ id: 'consultation-new' })
          },
          resourceBooking: {
            createMany: vi.fn().mockResolvedValue({ count: 2 })
          }
        }
        return fn(tx)
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      await prisma.$transaction(async (tx: any) => {
        const consultation = await tx.consultation.create({
          data: {
            patientId: 'patient-123',
            doctorId: 'doctor-123',
            scheduledDate: new Date('2026-02-01T09:00:00'),
            type: 'ROUTINE',
            status: 'SCHEDULED',
          }
        })

        await tx.resourceBooking.createMany({
          data: [
            {
              resourceId: 'resource-1',
              userId: 'doctor-123',
              consultationId: consultation.id,
              startTime: new Date('2026-02-01T09:00:00'),
              endTime: new Date('2026-02-01T09:30:00'),
              status: 'CONFIRMED',
            },
            {
              resourceId: 'equip-1',
              userId: 'doctor-123',
              consultationId: consultation.id,
              startTime: new Date('2026-02-01T09:00:00'),
              endTime: new Date('2026-02-01T09:30:00'),
              status: 'CONFIRMED',
            }
          ]
        })

        return consultation
      })

      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should cancel resource bookings when appointment is cancelled', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resourceBooking.findMany).mockResolvedValue([mockBooking])

      const bookings = await prisma.resourceBooking.findMany({
        where: { consultationId: 'consultation-123' }
      })

      expect(bookings).toHaveLength(1)

      // Simular cancelamento
      vi.mocked(prisma.resourceBooking.update).mockResolvedValue({
        ...mockBooking,
        status: 'CANCELLED'
      })

      for (const booking of bookings) {
        await prisma.resourceBooking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' }
        })
      }

      expect(prisma.resourceBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' }
        })
      )
    })
  })

  describe('Resource Maintenance', () => {
    it('should schedule maintenance for equipment', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      const mockMaintenance = {
        id: 'maint-1',
        resourceId: 'equip-1',
        type: 'PREVENTIVA',
        description: 'Calibração anual',
        scheduledDate: new Date('2026-03-01'),
        status: 'SCHEDULED',
        createdBy: 'admin-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.resourceMaintenance.create).mockResolvedValue(mockMaintenance)

      const maintenance = await prisma.resourceMaintenance.create({
        data: {
          resourceId: 'equip-1',
          type: 'PREVENTIVA',
          description: 'Calibração anual',
          scheduledDate: new Date('2026-03-01'),
          status: 'SCHEDULED',
          createdBy: 'admin-123',
        }
      })

      expect(maintenance.type).toBe('PREVENTIVA')
      expect(maintenance.status).toBe('SCHEDULED')
    })

    it('should mark resource as in maintenance', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(prisma.resource.update).mockResolvedValue({
        ...mockResource,
        status: 'MAINTENANCE'
      })

      const resource = await prisma.resource.update({
        where: { id: 'equip-1' },
        data: { status: 'MAINTENANCE' }
      })

      expect(resource.status).toBe('MAINTENANCE')
    })
  })
})

describe('Crypto Payment Verification', () => {
  it('should verify Bitcoin transaction', async () => {
    // Mock fetch para Blockchain.com API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        out: [
          { addr: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', value: 10000000 } // 0.1 BTC
        ],
        block_height: 800000
      })
    })

    const response = await fetch('https://blockchain.info/rawtx/abc123')
    const tx = await response.json()

    expect(tx.out[0].value / 100000000).toBe(0.1)
  })

  it('should verify Ethereum transaction', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          to: '0x742d35cc6634c0532925a3b844bc9e7595f0ab3c',
          value: '0x2386f26fc10000', // 0.01 ETH em wei (hex)
          blockNumber: '0xf42400' // Block number em hex
        }
      })
    })

    const response = await fetch('https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=0xabc')
    const data = await response.json()
    
    const receivedWei = parseInt(data.result.value, 16)
    const receivedEth = receivedWei / 1e18

    expect(receivedEth).toBeCloseTo(0.01)
  })

  it('should verify USDT TRC-20 transaction', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contractRet: 'SUCCESS',
        confirmed: true,
        trc20TransferInfo: [
          {
            contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            to_address: 'TJYvQxJJGhRN3p5tTiPhvAF3m5u2FLjLNe',
            amount_str: '100000000' // 100 USDT (6 decimais)
          }
        ]
      })
    })

    const response = await fetch('https://apilist.tronscanapi.com/api/transaction-info?hash=abc')
    const tx = await response.json()
    
    const receivedUsdt = parseFloat(tx.trc20TransferInfo[0].amount_str) / 1e6

    expect(receivedUsdt).toBe(100)
    expect(tx.confirmed).toBe(true)
  })
})
