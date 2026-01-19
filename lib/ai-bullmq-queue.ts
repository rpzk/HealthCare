import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import { medicalAI } from './advanced-medical-ai'
import { incCounter, observeHistogram } from './metrics'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

export const aiQueue = new Queue('ai-jobs', { connection })
const events = new QueueEvents('ai-jobs', { connection })

// Worker
new Worker('ai-jobs', async job => {
  const start = Date.now()
  try {
    switch(job.name){
      case 'symptom_analysis':
        const result = await medicalAI.analyzeSymptoms(job.data.payload)
        incCounter('ai_queue_processed_total', { type: job.name })
        observeHistogram('ai_queue_job_duration_ms', Date.now()-start, { type: job.name })
        return result
      default:
        throw new Error('Tipo de job desconhecido')
    }
  } catch(e){
    incCounter('ai_queue_failed_total', { type: job.name })
    throw e
  }
},{ connection, concurrency: 2 })

// Eventos
events.on('completed', ({ jobId }) => {
  // poderia logar
})

events.on('failed', ({ jobId, failedReason }) => {
  // log error
})

export async function enqueueAI(type: 'symptom_analysis', payload: any, opts: JobsOptions = {}) {
  incCounter('ai_queue_jobs_total', { type })
  return aiQueue.add(type, { payload }, opts)
}
