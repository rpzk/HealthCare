import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const system = searchParams.get('system') || undefined
  
  const chapters = await CodingService.listChapters(system)
  return NextResponse.json({ chapters })
})
