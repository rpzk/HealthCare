import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async () => {
  console.log('[TEST-ENDPOINT] GET /api/test called')
  try {
    return NextResponse.json({ success: true, message: 'Test endpoint working' })
  } catch (error) {
    console.error('[TEST-ENDPOINT] Error:', error)
    return NextResponse.json({ error: 'Test endpoint error' }, { status: 500 })
  }
}
