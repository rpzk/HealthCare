import { NextRequest, NextResponse } from 'next/server'
import { QueueEvents } from 'bullmq'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
}

export const GET = withDoctorAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

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

  const jobId = params.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: any) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      const events = new QueueEvents('ai-jobs', { connection: getRedisConnection() })

      const onProgress = ({ jobId: evJobId, data }: any) => {
        if (evJobId === jobId) send('progress', data ?? {})
      }
      const onCompleted = ({ jobId: evJobId, returnvalue }: any) => {
        if (evJobId === jobId) {
          send('completed', returnvalue ?? {})
          cleanup()
        }
      }
      const onFailed = ({ jobId: evJobId, failedReason }: any) => {
        if (evJobId === jobId) {
          send('failed', { error: failedReason })
          cleanup()
        }
      }

      events.on('progress', onProgress)
      events.on('completed', onCompleted)
      events.on('failed', onFailed)

      // Keep-alive pings
      const ka = setInterval(() => {
        controller.enqueue(encoder.encode(`:keep-alive\n\n`))
      }, 15000)

      const cleanup = () => {
        try {
          events.off('progress', onProgress)
          events.off('completed', onCompleted)
          events.off('failed', onFailed)
        } catch {}
        try { clearInterval(ka) } catch {}
        try { events.close() } catch {}
        try { controller.close() } catch {}
      }

      // Client disconnected
      try { req.signal.addEventListener('abort', cleanup) } catch {}
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  })
})
