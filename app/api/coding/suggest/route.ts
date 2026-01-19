import { NextRequest, NextResponse } from 'next/server'
import { CodingService } from '@/lib/coding-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const freeText: string = body.freeText || ''
    const systemKind: string | undefined = body.systemKind
    const limit: number | undefined = body.limit
  const suggestions = await CodingService.suggestCodes({ freeText, systemKind, limit })
    return NextResponse.json({ suggestions })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'suggest_failed' }, { status: 400 })
  }
}