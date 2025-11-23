import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withDoctorAuth(async (req: NextRequest) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

  // MVP: aceita { transcriptText } e normaliza; áudio real virá depois
  const body = await req.json().catch(() => ({})) as any
  const transcriptText = (body.transcriptText || '').toString()
  if (!transcriptText || transcriptText.length < 5) {
    return NextResponse.json({ error: 'Texto insuficiente' }, { status: 400 })
  }
  const normalized = transcriptText.trim().replace(/[ \t]+/g, ' ')
  return NextResponse.json({ transcript: normalized })
})
