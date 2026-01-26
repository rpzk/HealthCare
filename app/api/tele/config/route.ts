import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/rate-limiter'
export const dynamic = 'force-dynamic'



function getPublicHost(req: NextRequest): string | null {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost || req.headers.get('host')
  if (!host) return null

  // host may include port; keep IPv6 bracket form intact
  if (host.startsWith('[')) {
    const idx = host.indexOf(']')
    if (idx === -1) return host
    return host.slice(0, idx + 1)
  }

  return host.split(':')[0]
}

function parseIceEnv(v?: string) {
  if (!v) return [{ urls: 'stun:stun.l.google.com:19302' }]
  const parts = String(v).split(';').map(s=>s.trim()).filter(Boolean)
  const servers = parts.map(p=>{
    const [urls, username, credential] = p.split(',')
    const obj: any = { urls }
    if (username) obj.username = username
    if (credential) obj.credential = credential
    return obj
  })
  return servers.length ? servers : [{ urls: 'stun:stun.l.google.com:19302' }]
}

export async function GET(req: NextRequest) {
  const rl = rateLimiters.dashboard(req)
  if (rl instanceof NextResponse) return rl

  const iceEnv = (process.env.NEXT_PUBLIC_ICE || '').trim()
  const parsed = parseIceEnv(iceEnv)

  const hasTurn = parsed.some((s: any) => {
    const urls = s?.urls
    const list = Array.isArray(urls) ? urls : [urls]
    return list.some((u) => typeof u === 'string' && u.startsWith('turn:'))
  })

  // If TURN isn't configured, synthesize a reasonable default using current host.
  // This is important for patients behind strict NATs where STUN-only fails.
  const host = getPublicHost(req)
  const turnUsername = (process.env.TURN_USERNAME || 'teleuser').trim()
  const turnCredential = (process.env.TURN_PASSWORD || 'telepass').trim()

  const iceServers: any[] = [...parsed]
  if (!hasTurn && host && turnUsername && turnCredential) {
    iceServers.unshift({
      urls: [
        `turn:${host}:3478`,
        `turn:${host}:3478?transport=tcp`,
      ],
      username: turnUsername,
      credential: turnCredential,
    })
  }

  // Ensure at least one STUN server exists
  const hasStun = iceServers.some((s: any) => {
    const urls = s?.urls
    const list = Array.isArray(urls) ? urls : [urls]
    return list.some((u) => typeof u === 'string' && u.startsWith('stun:'))
  })
  if (!hasStun) {
    iceServers.push({ urls: 'stun:stun.l.google.com:19302' })
  }

  return NextResponse.json({ iceServers })
}
