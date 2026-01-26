import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'
import { rateLimiters } from '@/lib/rate-limiter'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimiters.dashboard(req)
  if (rl instanceof NextResponse) return rl
  const roomId = params?.id as string
  if (!roomId) return NextResponse.json({ error: 'roomId ausente' }, { status: 400 })
  const body = await req.json().catch((err: unknown) => {
    logger.warn('Invalid JSON in tele signal POST', err)
    return null
  })
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const { type, sdp, candidate, from, token } = body
  if (!from) return NextResponse.json({ error: 'from ausente' }, { status: 400 })
  if (!type && !candidate) return NextResponse.json({ error: 'mensagem inválida' }, { status: 400 })

  // Auth: allow either an authenticated session OR a valid public join token (meetingLink)
  const session = await getServerSession(authOptions).catch(() => null)
  const hasSession = !!session?.user?.id
  if (!hasSession) {
    const url = new URL(req.url)
    const tokenFromQuery = url.searchParams.get('token') || ''
    const tokenValue = (typeof token === 'string' ? token : '') || tokenFromQuery
    if (!tokenValue) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const valid = await prisma.consultation.findFirst({
      where: { id: roomId, meetingLink: tokenValue },
      select: { id: true },
    })
    if (!valid) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const pub = new Redis(getRedisConnection())
  const channel = `tele:room:${roomId}`
  await pub.publish(channel, JSON.stringify({ type, sdp, candidate, from, at: Date.now() }))
  try {
    await pub.quit()
  } catch (err: unknown) {
    logger.warn('Error quitting redis publisher', err)
  }
  return NextResponse.json({ ok: true })
}
