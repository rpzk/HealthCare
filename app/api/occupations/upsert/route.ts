import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { requireSession, canManageOccupation } from '@/lib/rbac'
import { validateOccupation } from '@/lib/validation-schemas'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSession(['ADMIN'])
    if(!canManageOccupation(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const v = validateOccupation(body)
    if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const occupation = await OccupationCapabilityService.upsertOccupation(v.data!, { id: actor.id, email: actor.email||undefined, role: actor.role })
    return NextResponse.json({ occupation })
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 401 }) }
}
