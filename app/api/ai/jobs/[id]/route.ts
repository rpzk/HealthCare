import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { getAIJobStatus, cancelAIJob } from '@/lib/ai-queue-factory'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

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
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  const { id } = params || {}
  if (!id) return NextResponse.json({ error: 'Job id ausente' }, { status: 400 })
  
  const jobStatus = await getAIJobStatus(id)
  
  if (jobStatus.status === 'failed' && jobStatus.error?.includes('not found')) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ 
    id, 
    state: jobStatus.status, 
    progress: jobStatus.progress, 
    result: jobStatus.result 
  })
})
