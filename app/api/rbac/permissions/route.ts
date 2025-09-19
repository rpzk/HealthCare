import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { withAdminAuth } from '@/lib/with-auth'
import { RBAC_MATRIX } from '@/lib/rbac'

export const GET = withAdminAuth(async () => {
  return NextResponse.json({ rbac: RBAC_MATRIX, generatedAt: new Date().toISOString() })
})
