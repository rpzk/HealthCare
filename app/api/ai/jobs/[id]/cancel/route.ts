import { NextRequest, NextResponse } from 'next/server'
import { Job, Queue } from 'bullmq'
import Redis from 'ioredis'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'
import { logger } from '@/lib/logger'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

function attachRedisErrorHandler(client: Redis, context: string) {
  client.on('error', (err: NodeJS.ErrnoException) => {
    if (err?.code === 'ECONNREFUSED') return
    logger.warn({ err, context }, 'Redis error')
  })
}

export const POST = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl
  const jobId = params.id

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: user.id,
      audience: TermAudience.PROFESSIONAL,
      gates: ['AI'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  try {
    const queue = new Queue('ai-jobs', { connection })
    void queue.client
      .then((client) => attachRedisErrorHandler(client as unknown as Redis, 'bullmq:aiQueue(cancel)'))
      .catch(() => undefined)

    const job = await Job.fromId(queue, jobId)
    if (!job) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

    const state = await job.getState()
    if (state === 'waiting' || state === 'delayed') {
      // Remove imediatamente se ainda não está executando
      await job.remove()
      return NextResponse.json({ cancelled: true, removed: true })
    }

    // Marca cancelamento para o worker interromper no próximo checkpoint
    const redis = new Redis({
      ...connection,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    })
    attachRedisErrorHandler(redis, 'ai-cancel-flag(route)')

    try {
      await redis.set(`ai-job:cancel:${jobId}`, '1', 'EX', 3600)
    } finally {
      try {
        await redis.quit()
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ cancelled: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao cancelar job' }, { status: 500 })
  }
})
