import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import Redis from 'ioredis'
import { medicalAI } from './advanced-medical-ai'
import { incCounter, observeHistogram } from './metrics'
import path from 'path'
import { transcribeFile } from '@/lib/stt-service'
import { generateSoapFromTranscript } from '@/lib/ai-soap'
import { saveSoapAsMedicalRecord } from '@/lib/soap-persistence'
import { generatePatientPdfHtml, generatePatientPdfFromHtml } from '@/lib/pdf-patient-export'
import { signPdf } from '@/lib/pdf-signing'
import prisma from '@/lib/prisma'
import { promises as fs } from 'fs'
import { logger } from '@/lib/logger'
import type { AIJobType } from './ai-queue-factory'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

function attachRedisErrorHandler(client: Redis, context: string) {
  client.on('error', (err: NodeJS.ErrnoException) => {
    // During build/dev, Redis might not be running; avoid noisy logs.
    if (err?.code === 'ECONNREFUSED') return
    logger.warn({ err, context }, 'Redis error')
  })
}

export const aiQueue = new Queue('ai-jobs', { connection })
const events = new QueueEvents('ai-jobs', { connection })
const redis = new Redis({
  ...connection,
  lazyConnect: true,
  maxRetriesPerRequest: 2,
})

// Ensure BullMQ/ioredis clients always have error listeners.
void aiQueue.client
  .then((client) => attachRedisErrorHandler(client as unknown as Redis, 'bullmq:aiQueue'))
  .catch(() => undefined)
void events.client
  .then((client) => attachRedisErrorHandler(client as unknown as Redis, 'bullmq:events'))
  .catch(() => undefined)
attachRedisErrorHandler(redis, 'ai-cancel-flag')

async function checkCancelled(jobId: string) {
  try {
    const v = await redis.get(`ai-job:cancel:${jobId}`)
    return v === '1'
  } catch {
    return false
  }
}

// Update job progress in database
async function updateJobProgress(
  exportId: string,
  step: string,
  percentage: number,
  message?: string
) {
  try {
    // Atualize o progresso no modelo PatientPdfExport
    await prisma.patientPdfExport.update({
      where: { id: exportId },
      data: {
        progress: percentage,
        errorMessage: message || undefined,
      },
    })
  } catch (e) {
    logger.error('[PDF Export Progress] Error updating log:', e)
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
      case 'patient_pdf_export': {
        // Expected payload: { patientId, exportId }
        const { patientId, exportId } = job.data.payload || {}
        if (!patientId || !exportId) throw new Error('Payload inválido para patient_pdf_export')

        try {
          // Update status to PROCESSING
          await prisma.patientPdfExport.update({
            where: { id: exportId },
            data: { status: 'PROCESSING', bullmqJobId: job.id },
          })

          // Step 1: Generate HTML
          await job.updateProgress({ step: 'generating_html', pct: 20 })
          await updateJobProgress(exportId, 'generating_html', 20, 'Gerando HTML do prontuário...')
          
          const html = await generatePatientPdfHtml({ patientId })

          // Step 2: Generate PDF from HTML
          await job.updateProgress({ step: 'generating_pdf', pct: 50 })
          await updateJobProgress(exportId, 'generating_pdf', 50, 'Renderizando PDF...')
          
          const pdf = await generatePatientPdfFromHtml(html)

          // Step 3: Sign PDF
          await job.updateProgress({ step: 'signing_pdf', pct: 75 })
          await updateJobProgress(
            exportId,
            'signing_pdf',
            75,
            'Gerando carimbo de integridade (hash) do documento...'
          )
          
          const { signedPdf, metadata } = await signPdf({ pdf })

          // Step 4: Save to disk
          await job.updateProgress({ step: 'saving', pct: 90 })
          await updateJobProgress(exportId, 'saving', 90, 'Salvando arquivo...')
          
          const baseDir = '/home/umbrel/backups/healthcare'
          await fs.mkdir(baseDir, { recursive: true })
          
          const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14)
          const filename = `patient_pdf_${ts}_${patientId}.pdf`
          const filePath = path.join(baseDir, filename)
          
          await fs.writeFile(filePath, signedPdf)
          const fileSize = signedPdf.length

          // Step 5: Update export record
          await job.updateProgress({ step: 'completed', pct: 100 })
          await updateJobProgress(exportId, 'completed', 100, 'Prontuário exportado com sucesso!')
          
          await prisma.patientPdfExport.update({
            where: { id: exportId },
            data: {
              status: 'COMPLETED',
              filename,
              filePath,
              fileSize,
              completedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          })

          incCounter('ai_queue_processed_total', { type: job.name })
          observeHistogram('ai_queue_job_duration_ms', Date.now()-start, { type: job.name })
          
          return { filename, fileSize, metadata }
        } catch (e: any) {
          // Update export record with error
          await prisma.patientPdfExport.update({
            where: { id: exportId },
            data: {
              status: 'FAILED',
              errorMessage: e?.message || 'Erro desconhecido ao gerar PDF',
            },
          })
          throw e
        }
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
  type: AIJobType,
  payload: Record<string, unknown>,
  opts: JobsOptions = {}
) {
  incCounter('ai_queue_jobs_total', { type })
  return aiQueue.add(type, { payload }, opts)
}

export async function cancelAIJob(jobId: string): Promise<void> {
  const key = `ai-job:cancel:${jobId}`
  try {
    await redis.set(key, '1', 'EX', 60 * 60 * 24)
  } catch (e) {
    logger.warn({ err: e, jobId }, 'Failed to set cancel flag for AI job')
  }
}

