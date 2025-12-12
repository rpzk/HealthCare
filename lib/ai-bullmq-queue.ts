import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import Redis from 'ioredis'
import { medicalAI } from './advanced-medical-ai'
import { incCounter, observeHistogram } from './metrics'
import path from 'path'
import { transcribeFile } from '@/lib/stt-service'
import { generateSoapFromTranscript } from '@/lib/ai-soap'
import { saveSoapAsMedicalRecord } from '@/lib/soap-persistence'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

export const aiQueue = new Queue('ai-jobs', { connection })
const events = new QueueEvents('ai-jobs', { connection })
const redis = new Redis(connection)

async function checkCancelled(jobId: string) {
  try {
    const v = await redis.get(`ai-job:cancel:${jobId}`)
    return v === '1'
  } catch {
    return false
  }
}

// Worker
new Worker('ai-jobs', async job => {
  const start = Date.now()
  try {
    switch(job.name){
      case 'symptom_analysis': {
        const result = await medicalAI.analyzeSymptoms(job.data.payload)
        incCounter('ai_queue_processed_total', { type: job.name })
        observeHistogram('ai_queue_job_duration_ms', Date.now()-start, { type: job.name })
        return result
      }
      case 'transcribe_and_generate_soap_draft': {
        // Expected payload: { filePath, patientId?, doctorId?, locale?, speciality? }
        const { filePath, locale, speciality } = job.data.payload || {}
        if (!filePath) throw new Error('Payload inválido para transcribe_and_generate_soap_draft')
        await job.updateProgress({ step: 'transcribing', pct: 10 })
        const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
        const stt = await transcribeFile(abs)
        if (await checkCancelled(job.id as string)) { await job.updateProgress({ step: 'cancelled' }); throw new Error('Job cancelado') }
        await job.updateProgress({ step: 'generating_soap', pct: 60, provider: stt.provider })
        const soap = await generateSoapFromTranscript({ transcript: stt.text, locale, speciality })
        await job.updateProgress({ step: 'completed', pct: 100 })
        incCounter('ai_queue_processed_total', { type: job.name })
        observeHistogram('ai_queue_job_duration_ms', Date.now()-start, { type: job.name })
        return { soap, provider: stt.provider }
      }
      case 'transcribe_and_generate_soap': {
        // Expected payload: { filePath, patientId, doctorId, locale?, speciality? }
        const { filePath, patientId, doctorId, locale, speciality } = job.data.payload || {}
        if (!filePath || !patientId || !doctorId) throw new Error('Payload inválido para transcribe_and_generate_soap')
        await job.updateProgress({ step: 'transcribing', pct: 10 })
        // Ensure absolute path
        const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
        const stt = await transcribeFile(abs)
        if (await checkCancelled(job.id as string)) { await job.updateProgress({ step: 'cancelled' }); throw new Error('Job cancelado') }
        await job.updateProgress({ step: 'generating_soap', pct: 60, provider: stt.provider })
        const soap = await generateSoapFromTranscript({ transcript: stt.text, locale, speciality })
        if (await checkCancelled(job.id as string)) { await job.updateProgress({ step: 'cancelled' }); throw new Error('Job cancelado') }
        await job.updateProgress({ step: 'saving_record', pct: 85 })
        const saved = await saveSoapAsMedicalRecord({ patientId, doctorId, soap })
        await job.updateProgress({ step: 'completed', pct: 100, recordId: saved.id })
        incCounter('ai_queue_processed_total', { type: job.name })
        observeHistogram('ai_queue_job_duration_ms', Date.now()-start, { type: job.name })
        return { recordId: saved.id, provider: stt.provider }
      }
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

export async function enqueueAI(
  type: 'symptom_analysis' | 'transcribe_and_generate_soap' | 'transcribe_and_generate_soap_draft',
  payload: Record<string, unknown>,
  opts: JobsOptions = {}
) {
  incCounter('ai_queue_jobs_total', { type })
  return aiQueue.add(type, { payload }, opts)
}
