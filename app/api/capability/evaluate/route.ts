import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { requireSession, canEvaluate } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSession()
    if(!canEvaluate(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
  const evalRecord = await OccupationCapabilityService.evaluateCapability(body, { id: actor.id, email: actor.email||undefined, role: actor.role })
    return NextResponse.json({ evaluation: evalRecord })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'evaluation_error' }, { status: 400 })
  }
}
