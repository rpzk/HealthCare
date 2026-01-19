import { NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth-v2'
import { validateCodeSystem } from '@/lib/validation-schemas'
import { CodingService } from '@/lib/coding-service'

export const POST = withAdminAuthUnlimited(async (req) => {
  const body = await req.json()
  const v = validateCodeSystem(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const cs = await CodingService.upsertCodeSystem(v.data as any)
  return NextResponse.json(cs, { status: 201 })
})
