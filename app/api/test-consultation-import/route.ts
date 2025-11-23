import { NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

export async function GET() {
  try {
    return NextResponse.json({
      message: 'ConsultationService import successful',
      serviceType: typeof ConsultationService,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      message: 'Failed to load ConsultationService'
    }, { status: 500 })
  }
}
