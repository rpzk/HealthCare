import { NextRequest, NextResponse } from 'next/server'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { validateAssignUserRole } from '@/lib/validation-schemas'
import { requireSession, canManageOccupation } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSession(['ADMIN'])
    if(!canManageOccupation(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const v = validateAssignUserRole(body)
    if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const assignment = await OccupationCapabilityService.assignUserRole(v.data!, { id: actor.id, email: actor.email||undefined, role: actor.role })
    return NextResponse.json({ assignment })
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 401 }) }
}
