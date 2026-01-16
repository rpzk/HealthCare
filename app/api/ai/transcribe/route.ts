import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withDoctorAuth(async (req: NextRequest, { user }) => {
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

  // MVP: aceita { transcriptText } e normaliza; áudio real virá depois
  const body = await req.json().catch(() => ({})) as any
  const transcriptText = (body.transcriptText || '').toString()
  if (!transcriptText || transcriptText.length < 5) {
    return NextResponse.json({ error: 'Texto insuficiente' }, { status: 400 })
  }
  const normalized = transcriptText.trim().replace(/[ \t]+/g, ' ')
  return NextResponse.json({ transcript: normalized })
})
