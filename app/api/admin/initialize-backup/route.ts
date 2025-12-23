/**
 * Initialize Backup Schedule API Route
 * Call this endpoint once to initialize the backup schedule
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Only allow in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKUP_SCHEDULE === 'true') {
      const { initializeBackupSchedule } = await import('@/lib/certificate-backup-service')
      initializeBackupSchedule()
      
      return NextResponse.json({
        success: true,
        message: 'Backup schedule initialized successfully'
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Backup schedule not enabled. Set ENABLE_BACKUP_SCHEDULE=true or run in production'
    }, { status: 400 })
  } catch (error) {
    console.error('Failed to initialize backup schedule:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
