import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const list = await OccupationCapabilityService.listUserEvaluations(params.id)
  return NextResponse.json({ evaluations: list })
}
