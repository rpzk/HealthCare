import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { aiQueue } from '@/lib/ai-bullmq-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withDoctorAuth(async (req: NextRequest, { params }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl
  const { id } = params || {}
  if (!id) return NextResponse.json({ error: 'Job id ausente' }, { status: 400 })
  const job = await aiQueue.getJob(id)
  if (!job) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

  const state = await job.getState()
  const result = job.returnvalue
  const progress = job.progress

  return NextResponse.json({ id: job.id, state, progress, result })
})
