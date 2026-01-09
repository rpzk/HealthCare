/**
 * Initialize Backup Schedule API Route
 * Call this endpoint once to initialize the backup schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
  TermsNotAcceptedError,
  TermsNotConfiguredError,
} from '@/lib/terms-enforcement'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      if (e instanceof TermsNotAcceptedError) {
        return NextResponse.json(
          {
            success: false,
            message: e.message,
            code: e.code,
            missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
          },
          { status: 403 }
        )
      }
      if (e instanceof TermsNotConfiguredError) {
        return NextResponse.json(
          { success: false, message: e.message, code: e.code, missing: e.missing },
          { status: 503 }
        )
      }
      throw e
    }

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
