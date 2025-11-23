import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
}

export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.consultations(req)
  if (rl instanceof NextResponse) return rl
  const roomId = params?.id as string
  if (!roomId) return NextResponse.json({ error: 'roomId ausente' }, { status: 400 })

  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId') || ''
  if (!clientId) return NextResponse.json({ error: 'clientId ausente' }, { status: 400 })

  const encoder = new TextEncoder()
  const channel = `tele:room:${roomId}`

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: any) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      const sub = new Redis(getRedisConnection())
      sub.subscribe(channel).then(() => {
        // send hello
        send('ready', { ok: true })
      }).catch(err => {
        send('error', { error: err?.message || 'subscribe failed' })
      })

      const onMessage = (_chan: string, message: string) => {
        try {
          const evt = JSON.parse(message)
          // Do not echo to sender
          if (evt?.from && evt.from === clientId) return
          // Only same room messages are published on this channel
          send('signal', evt)
        } catch (e) {
          send('error', { error: 'invalid message' })
        }
      }
      sub.on('message', onMessage)

      // keep alive
      const ka = setInterval(() => {
        try { controller.enqueue(encoder.encode(`:ka\n\n`)) } catch {}
      }, 15000)

      const cleanup = () => {
        try { sub.off('message', onMessage) } catch {}
        try { sub.unsubscribe(channel) } catch {}
        try { sub.quit() } catch {}
        try { clearInterval(ka) } catch {}
        try { controller.close() } catch {}
      }

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
