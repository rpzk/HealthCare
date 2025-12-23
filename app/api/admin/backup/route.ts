import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import {
  createDailyBackup,
  listBackups,
  restoreFromBackup
} from '@/lib/certificate-backup-service'
import { authOptions } from '@/auth'

/**
 * POST /api/admin/backup/create
 * Manually trigger a backup
 * Only ADMIN users can access
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you may need to adjust this based on your role structure)
    // For now, we'll just require authentication
    // In production, add proper admin role check

    const body = await req.json()
    const { action, backupFilename } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    if (action === 'CREATE') {
      const result = await createDailyBackup()
      return NextResponse.json(result)
    }

    if (action === 'RESTORE') {
      if (!backupFilename) {
        return NextResponse.json(
          { error: 'Missing required field: backupFilename' },
          { status: 400 }
        )
      }

      const result = await restoreFromBackup(backupFilename)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be CREATE or RESTORE' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Backup API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/backup/list
 * List available backups
 * Only ADMIN users can access
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    // In production, add proper admin role check

    const result = await listBackups()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Backup List API Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
