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
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      const sub = new Redis(getRedisConnection())
      sub.subscribe(channel).then(() => {
        // send hello
        send('ready', { ok: true })
      }).catch((err: unknown) => {
        if (err instanceof Error) send('error', { error: err.message })
        else send('error', { error: String(err) || 'subscribe failed' })
      })

      const onMessage = (_chan: string, message: string) => {
        try {
          const evt = JSON.parse(message)
          // Do not echo to sender
          if (evt?.from && evt.from === clientId) return
          // Only same room messages are published on this channel
          send('signal', evt)
        } catch (e: unknown) {
          if (e instanceof Error) console.warn('Invalid message in redis onMessage:', e.message)
          else console.warn('Invalid message in redis onMessage:', String(e))
          send('error', { error: 'invalid message' })
        }
      }
      sub.on('message', onMessage)

      // keep alive
      const ka = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:ka\n\n`))
        } catch (err: unknown) {
          console.warn('Failed to enqueue keepalive event', err)
        }
      }, 15000)

      const cleanup = () => {
        try {
          sub.off('message', onMessage)
        } catch (err: unknown) {
          console.warn('Error removing redis message listener', err)
        }

        try {
          sub.unsubscribe(channel)
        } catch (err: unknown) {
          console.warn('Error unsubscribing redis channel', err)
        }

        try {
          sub.quit()
        } catch (err: unknown) {
          console.warn('Error quitting redis connection', err)
        }

        try {
          clearInterval(ka)
        } catch (err: unknown) {
          console.warn('Error clearing keepalive interval', err)
        }

        try {
          controller.close()
        } catch (err: unknown) {
          console.warn('Error closing stream controller', err)
        }
      }

      try {
        if (req.signal && typeof req.signal.addEventListener === 'function') {
          req.signal.addEventListener('abort', cleanup)
        }
      } catch (err: unknown) {
        console.warn('Error attaching abort listener to request signal', err)
      }
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
