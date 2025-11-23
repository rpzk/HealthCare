import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

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

export const GET = withAuth(async (req: NextRequest) => {
  const rl = rateLimiters.consultations(req)
  if (rl instanceof NextResponse) return rl
  const iceEnv = process.env.NEXT_PUBLIC_ICE || ''
  const iceServers = parseIceEnv(iceEnv)
  return NextResponse.json({ iceServers })
})
