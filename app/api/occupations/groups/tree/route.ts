import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const depth = parseInt(searchParams.get('depth') || '3')
  const tree = await OccupationCapabilityService.groupTree(Math.min(Math.max(depth,1),8))
  return NextResponse.json({ tree })
}
