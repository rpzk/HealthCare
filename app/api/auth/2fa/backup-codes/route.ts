export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { regenerateBackupCodes } from '@/lib/two-factor'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/2fa/backup-codes
 * Regenera backup codes do 2FA
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    const backupCodes = await regenerateBackupCodes(session.user.id)
    
    logger.info({ userId: session.user.id }, 'Backup codes regenerados')
    
    return NextResponse.json({ backupCodes })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao regenerar backup codes')
    
    return NextResponse.json(
      { error: error.message || 'Erro ao regenerar códigos' },
      { status: 400 }
    )
  }
}
