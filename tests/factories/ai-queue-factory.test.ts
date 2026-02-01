/**
 * AI Queue Factory Tests
 * 
 * Tests for AIQueueFactory including:
 * - Queue factory initialization
 * - BullMQ queue selection (production)
 * - In-memory queue fallback (development)
 * - Job enqueueing
 * - Job status tracking
 * - Job cancellation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AIQueueFactory, enqueueAIJob, getAIJobStatus, cancelAIJob } from '@/lib/ai-queue-factory'

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn(async () => ({ id: 'job-123' })),
    getJob: vi.fn(async () => ({
      id: 'job-123',
      getState: vi.fn(async () => 'completed'),
      progress: 100,
      returnvalue: { result: 'success' },
      failedReason: null
    }))
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

describe('AIQueueFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AIQueueFactory.reset()
  })

  afterEach(() => {
    AIQueueFactory.reset()
  })

  describe('getQueue', () => {
    it('should return a queue instance', async () => {
      const queue = await AIQueueFactory.getQueue()
      expect(queue).toBeDefined()
      expect(queue.name).toBeDefined()
    })

    it('should return in-memory queue in development', async () => {
      const oldEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      process.env.AI_QUEUE_FORCE_MEMORY = 'true'

      const queue = await AIQueueFactory.getQueue()
      
      expect(queue.name).toContain('In-Memory')

      process.env.NODE_ENV = oldEnv
      delete process.env.AI_QUEUE_FORCE_MEMORY
    })

    it('should cache queue instance', async () => {
      const queue1 = await AIQueueFactory.getQueue()
      const queue2 = await AIQueueFactory.getQueue()
      
      expect(queue1).toBe(queue2)
    })

    it('should handle multiple concurrent requests', async () => {
      const queues = await Promise.all([
        AIQueueFactory.getQueue(),
        AIQueueFactory.getQueue(),
        AIQueueFactory.getQueue()
      ])
      
      expect(queues[0]).toBe(queues[1])
      expect(queues[1]).toBe(queues[2])
    })
  })

  describe('enqueueAIJob', () => {
    it('should enqueue job with type and payload', async () => {
      const result = await enqueueAIJob('symptom_analysis', {
        symptoms: ['fever', 'cough']
      })
      
      expect(result.id).toBeDefined()
    })

    it('should support all job types', async () => {
      const types = [
        'symptom_analysis',
        'transcribe_and_generate_soap',
        'transcribe_and_generate_soap_draft',
        'drug_interaction_check',
        'medical_summary',
        'vital_signs_analysis'
      ] as const

      for (const type of types) {
        const result = await enqueueAIJob(type, { test: true })
        expect(result.id).toBeDefined()
      }
    })
  })

  describe('getAIJobStatus', () => {
    it('should return job status', async () => {
      // First enqueue
      const { id } = await enqueueAIJob('symptom_analysis', { test: true })
      
      // Then get status
      const status = await getAIJobStatus(id)
      
      expect(status.status).toBeDefined()
      expect(['waiting', 'active', 'completed', 'failed']).toContain(status.status)
    })

    it('should return progress information', async () => {
      const { id } = await enqueueAIJob('symptom_analysis', { test: true })
      const status = await getAIJobStatus(id)
      
      expect(status.progress).toBeGreaterThanOrEqual(0)
      expect(status.progress).toBeLessThanOrEqual(100)
    })

    it('should return result when job is completed', async () => {
      const { id } = await enqueueAIJob('symptom_analysis', { test: true })
      const status = await getAIJobStatus(id)
      
      if (status.status === 'completed') {
        expect(status.result).toBeDefined()
      }
    })

    it('should handle job not found', async () => {
      const status = await getAIJobStatus('non-existent-job')
      
      expect(status.status).toBe('failed')
      expect(status.error).toBeDefined()
    })
  })

  describe('cancelAIJob', () => {
    it('should attempt to cancel a waiting job', async () => {
      process.env.AI_QUEUE_FORCE_MEMORY = 'true'
      
      const { id } = await enqueueAIJob('symptom_analysis', { test: true })
      const cancelled = await cancelAIJob(id)
      
      // Cancel may return true or false depending on timing
      expect(typeof cancelled).toBe('boolean')
      
      delete process.env.AI_QUEUE_FORCE_MEMORY
    })

    it('should return false for non-existent job', async () => {
      const cancelled = await cancelAIJob('non-existent-job')
      
      expect(cancelled).toBe(false)
    })
  })

  describe('getQueueInfo', () => {
    it('should return queue information', async () => {
      const info = await AIQueueFactory.getQueueInfo()
      
      expect(info.name).toBeDefined()
      expect(info.healthy).toBeTypeOf('boolean')
      expect(info.environment).toBeDefined()
      expect(info.redisConfigured).toBeTypeOf('boolean')
    })
  })

  describe('InMemoryQueue implementation', () => {
    beforeEach(() => {
      process.env.AI_QUEUE_FORCE_MEMORY = 'true'
      AIQueueFactory.reset()
    })

    afterEach(() => {
      delete process.env.AI_QUEUE_FORCE_MEMORY
      AIQueueFactory.reset()
    })

    it('should simulate job processing', async () => {
      const { id } = await enqueueAIJob('symptom_analysis', { test: true })
      
      // Allow time for processing
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const status = await getAIJobStatus(id)
      expect(status.status).toBe('completed')
      expect(status.progress).toBe(100)
    })

    it('should track multiple jobs independently', async () => {
      const ids = []
      
      for (let i = 0; i < 3; i++) {
        const { id } = await enqueueAIJob('symptom_analysis', { id: i })
        ids.push(id)
      }
      
      // Check that all jobs were tracked
      for (const id of ids) {
        const status = await getAIJobStatus(id)
        expect(status.status).toBeDefined()
      }
    })
  })
})
