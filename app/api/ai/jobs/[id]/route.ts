import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { aiQueue } from '@/lib/ai-bullmq-queue'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms, TermsNotAcceptedError, TermsNotConfiguredError } from '@/lib/terms-enforcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: e.code, missing: e.missing },
        { status: 503 }
      )
    }
    throw e
  }

  const { id } = params || {}
  if (!id) return NextResponse.json({ error: 'Job id ausente' }, { status: 400 })
  const job = await aiQueue.getJob(id)
  if (!job) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

  const state = await job.getState()
  const result = job.returnvalue
  const progress = job.progress

  return NextResponse.json({ id: job.id, state, progress, result })
})
