import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')?.trim() || ''
  if (!query) return NextResponse.json({ error: 'query obrigatória' }, { status: 400 })
  const system = searchParams.get('system') as any | undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '25',10), 100)
  const results = await CodingService.searchCodes(query, system, limit)
  return NextResponse.json({ results })
})
