import { NextRequest, NextResponse } from 'next/server'

/**
 * Start GOV.BR signing process
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Implement GOV.BR signature initiation
    return NextResponse.json({
      success: false,
      error: 'Not implemented',
    }, { status: 501 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Signature initiation failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // TODO: Implement GOV.BR signature status check
    return NextResponse.json({
      success: false,
      error: 'Not implemented',
    }, { status: 501 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
}
