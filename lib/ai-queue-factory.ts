/**
 * AI Queue Factory
 * 
 * Factory Pattern para seleção automática da implementação de fila de IA
 * baseada no ambiente e disponibilidade do Redis.
 * 
 * - Produção: Usa BullMQ com Redis (persistente, robusto)
 * - Desenvolvimento: Fallback para in-memory se Redis indisponível
 */

import { logger } from './logger'

// Types para os diferentes tipos de jobs
export type AIJobType = 
  | 'symptom_analysis'
  | 'transcribe_and_generate_soap'
  | 'transcribe_and_generate_soap_draft'
  | 'drug_interaction_check'
  | 'medical_summary'
  | 'vital_signs_analysis'

export interface AIJobPayload {
  type: AIJobType
  data: any
  userId?: string
  metadata?: Record<string, any>
}

export interface AIJobResult {
  success: boolean
  data?: any
  error?: string
}

export interface AIQueueImplementation {
  name: string
  enqueue(jobType: AIJobType, payload: any, options?: any): Promise<{ id: string }>
  getJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed'
    progress?: number
    result?: any
    error?: string
  }>
  cancelJob(jobId: string): Promise<boolean>
  isHealthy(): Promise<boolean>
}

/**
 * BullMQ Queue Implementation (Production)
 */
class BullMQQueue implements AIQueueImplementation {
  name = 'BullMQ (Redis-backed)'
  private queue: any
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    try {
      // Lazy load BullMQ implementation
      const { aiQueue } = await import('./ai-bullmq-queue')
      this.queue = aiQueue
      this.isInitialized = true
      logger.info('BullMQ queue initialized')
    } catch (error) {
      logger.error({ error }, 'Failed to initialize BullMQ queue')
      throw error
    }
  }

  async enqueue(jobType: AIJobType, payload: any, options?: any) {
    await this.initialize()
    
    const { enqueueAI } = await import('./ai-bullmq-queue')
    const job = await enqueueAI(jobType, payload, options)
    
    return { id: job.id }
  }

  async getJobStatus(jobId: string) {
    await this.initialize()
    
    const { aiQueue } = await import('./ai-bullmq-queue')
    const job = await aiQueue.getJob(jobId)
    
    if (!job) {
      return { status: 'failed' as const, error: 'Job not found' }
    }

    const state = await job.getState()
    
    return {
      status: state as any,
      progress: job.progress as number,
      result: job.returnvalue,
      error: job.failedReason
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    await this.initialize()
    
    try {
      const { cancelAIJob } = await import('./ai-bullmq-queue')
      await cancelAIJob(jobId)
      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to cancel BullMQ job')
      return false
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.initialize()
      return true
    } catch {
      return false
    }
  }
}

/**
 * In-Memory Queue Implementation (Development Fallback)
 */
class InMemoryQueue implements AIQueueImplementation {
  name = 'In-Memory (Development)'
  private jobs = new Map<string, {
    id: string
    type: AIJobType
    payload: any
    status: 'waiting' | 'active' | 'completed' | 'failed'
    progress: number
    result?: any
    error?: string
    createdAt: Date
  }>()
  private processing = false

  async enqueue(jobType: AIJobType, payload: any, _options?: any) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.jobs.set(id, {
      id,
      type: jobType,
      payload,
      status: 'waiting',
      progress: 0,
      createdAt: new Date()
    })

    logger.info({ jobId: id, type: jobType }, 'Job enqueued (in-memory)')
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue().catch(err => 
        logger.error({ error: err }, 'Queue processing error')
      )
    }

    return { id }
  }

  async getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId)
    
    if (!job) {
      return { status: 'failed' as const, error: 'Job not found' }
    }

    return {
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    
    if (!job) return false
    
    if (job.status === 'waiting') {
      job.status = 'failed'
      job.error = 'Cancelled by user'
      return true
    }
    
    return false // Can't cancel active/completed jobs
  }

  async isHealthy(): Promise<boolean> {
    return true // In-memory is always healthy
  }

  private async processQueue() {
    this.processing = true

    while (this.jobs.size > 0) {
      // Find next waiting job
      const nextJob = Array.from(this.jobs.values())
        .find(j => j.status === 'waiting')

      if (!nextJob) break

      nextJob.status = 'active'
      
      try {
        logger.info({ jobId: nextJob.id, type: nextJob.type }, 'Processing job')
        
        // Simulate processing (in real implementation, call AI service)
        nextJob.progress = 50
        await new Promise(resolve => setTimeout(resolve, 100))
        
        nextJob.result = { simulated: true, type: nextJob.type }
        nextJob.status = 'completed'
        nextJob.progress = 100
        
        logger.info({ jobId: nextJob.id }, 'Job completed')
      } catch (error) {
        nextJob.status = 'failed'
        nextJob.error = error instanceof Error ? error.message : 'Unknown error'
        
        logger.error({ error, jobId: nextJob.id }, 'Job failed')
      }
    }

    this.processing = false
  }
}

/**
 * AI Queue Factory
 * Seleciona automaticamente a melhor implementação disponível
 */
export class AIQueueFactory {
  private static instance: AIQueueImplementation | null = null
  private static initializationPromise: Promise<AIQueueImplementation> | null = null

  /**
   * Obtém a implementação de fila apropriada
   */
  static async getQueue(): Promise<AIQueueImplementation> {
    if (this.instance) {
      return this.instance
    }

    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.initializeQueue()
    this.instance = await this.initializationPromise
    this.initializationPromise = null

    return this.instance
  }

  private static async initializeQueue(): Promise<AIQueueImplementation> {
    const env = process.env.NODE_ENV || 'development'
    const redisHost = process.env.REDIS_HOST
    const forceInMemory = process.env.AI_QUEUE_FORCE_MEMORY === 'true'

    logger.info({ 
      env, 
      redisHost: redisHost || 'not configured',
      forceInMemory 
    }, 'Initializing AI queue')

    // Force in-memory if explicitly requested
    if (forceInMemory) {
      logger.info('Using in-memory queue (forced by environment)')
      return new InMemoryQueue()
    }

    // Try BullMQ in production or when Redis is configured
    if (env === 'production' || redisHost) {
      try {
        const bullQueue = new BullMQQueue()
        const isHealthy = await bullQueue.isHealthy()
        
        if (isHealthy) {
          logger.info('Using BullMQ queue (production mode)')
          return bullQueue
        } else {
          logger.warn('BullMQ queue unhealthy, falling back to in-memory')
        }
      } catch (error) {
        logger.error({ error }, 'BullMQ initialization failed, falling back to in-memory')
      }
    }

    // Fallback to in-memory
    logger.info('Using in-memory queue (development mode)')
    return new InMemoryQueue()
  }

  /**
   * Force reset (for testing or reconfiguration)
   */
  static reset() {
    this.instance = null
    this.initializationPromise = null
  }

  /**
   * Get queue info
   */
  static async getQueueInfo() {
    const queue = await this.getQueue()
    const healthy = await queue.isHealthy()
    
    return {
      name: queue.name,
      healthy,
      environment: process.env.NODE_ENV || 'development',
      redisConfigured: !!process.env.REDIS_HOST
    }
  }
}

/**
 * Helper function - enqueue AI job using factory
 */
export async function enqueueAIJob(
  jobType: AIJobType, 
  payload: any, 
  options?: any
): Promise<{ id: string }> {
  const queue = await AIQueueFactory.getQueue()
  return queue.enqueue(jobType, payload, options)
}

/**
 * Helper function - get job status
 */
export async function getAIJobStatus(jobId: string) {
  const queue = await AIQueueFactory.getQueue()
  return queue.getJobStatus(jobId)
}

/**
 * Helper function - cancel job
 */
export async function cancelAIJob(jobId: string): Promise<boolean> {
  const queue = await AIQueueFactory.getQueue()
  return queue.cancelJob(jobId)
}

// Export for backwards compatibility
export { AIQueueFactory as default }
