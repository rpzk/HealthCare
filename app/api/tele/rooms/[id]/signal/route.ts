import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
}

export const POST = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.consultations(req)
  if (rl instanceof NextResponse) return rl
  const roomId = params?.id as string
  if (!roomId) return NextResponse.json({ error: 'roomId ausente' }, { status: 400 })
  const body = await req.json().catch(()=>null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const { type, sdp, candidate, from } = body
  if (!from) return NextResponse.json({ error: 'from ausente' }, { status: 400 })
  if (!type && !candidate) return NextResponse.json({ error: 'mensagem inválida' }, { status: 400 })

  const pub = new Redis(getRedisConnection())
  const channel = `tele:room:${roomId}`
  await pub.publish(channel, JSON.stringify({ type, sdp, candidate, from, at: Date.now() }))
  try { await pub.quit() } catch {}
  return NextResponse.json({ ok: true })
})
