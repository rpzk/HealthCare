import { NextRequest, NextResponse } from 'next/server'
import { Job, Queue } from 'bullmq'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

export const POST = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl
  const jobId = params.id
  try {
    const queue = new Queue('ai-jobs', { connection })
    const job = await Job.fromId(queue, jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }
    // Re-adiciona com os mesmos dados
    const newJob = await queue.add(job.name as any, job.data, {})
    return NextResponse.json({ jobId: newJob.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao reprocessar job' }, { status: 500 })
  }
})
