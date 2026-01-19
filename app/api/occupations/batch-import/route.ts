import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { requireSession, canManageOccupation } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSession(['ADMIN'])
    if(!canManageOccupation(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
  const result = await OccupationCapabilityService.batchImport(body, { id: actor.id, email: actor.email||undefined, role: actor.role })
    return NextResponse.json({ result })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
