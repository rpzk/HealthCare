import { NextResponse } from 'next/server'
import { withDashboardAuth } from '@/lib/advanced-auth'
import { CodingService } from '@/lib/coding-service'

export const GET = withDashboardAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const system = searchParams.get('system') || undefined
  const days = searchParams.get('days') ? parseInt(searchParams.get('days')!,10) : undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!,10) : undefined
  const top = await CodingService.topCodes({ systemKind: system, days, limit })
  return NextResponse.json({ top })
})
