import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')?.trim() || ''
  if (!query) return NextResponse.json({ error: 'query obrigatória' }, { status: 400 })
  const system = searchParams.get('system') as any | undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '25',10), 100)
  const fts = searchParams.get('fts') === '1'
  const chapter = searchParams.get('chapter') || undefined
  const sexRestriction = searchParams.get('sex') || undefined  // M ou F
  const categoriesOnly = searchParams.get('categories') === '1'
  
  const results = await CodingService.searchCodes(query, system, limit, {
    fts,
    chapter,
    sexRestriction,
    categoriesOnly
  })
  return NextResponse.json({ results })
})
