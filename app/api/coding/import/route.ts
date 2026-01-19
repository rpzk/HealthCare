import { NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth-v2'
import { validateCodeImport } from '@/lib/validation-schemas'
import { CodingService } from '@/lib/coding-service'

export const POST = withAdminAuthUnlimited(async (req) => {
  const body = await req.json()
  const v = validateCodeImport(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const result = await CodingService.bulkImportCodes(v.data as any)
  return NextResponse.json(result, { status: 201 })
})
