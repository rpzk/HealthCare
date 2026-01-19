import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!,10) : 100
  const timeline = await CodingService.patientCodeTimeline(patientId, limit)
  return NextResponse.json({ timeline })
})
