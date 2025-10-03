import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const roles = await OccupationCapabilityService.matchUserToRoles(params.userId, 40)
  return NextResponse.json({ roles })
}
