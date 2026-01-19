import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('diagnosisId')
  if (!id) return NextResponse.json({ error: 'diagnosisId é obrigatório' }, { status: 400 })
  const revs = await CodingService.listDiagnosisRevisions(id)
  return NextResponse.json({ revisions: revs })
})
