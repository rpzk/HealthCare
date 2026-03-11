import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listBackups } from '@/lib/certificate-backup-service'
import { BackupOrchestrator } from '@/lib/backup-orchestrator'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function listSystemBackups() {
  const backupDir = process.env.BACKUP_DIR || './backups'
  try {
    const files = readdirSync(backupDir)
    return files
      .filter((f) => f.endsWith('.sql.gz') || f.endsWith('.tar.gz') || f.includes('backup'))
      .map((file) => {
        const filePath = join(backupDir, file)
        const stats = statSync(filePath)
        return {
          filename: file,
          size: stats.size,
          sizeHuman: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: stats.mtime,
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch {
    return []
  }
}

/**
 * GET /api/admin/backups - Lista todos os backups
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const [certBackups, systemBackups] = await Promise.all([
      listBackups(),
      listSystemBackups(),
    ])

    const allBackups = [
      ...(certBackups.backups || []).map((b: any) => ({
        filename: b.filename,
        size: b.size,
        sizeHuman: b.size ? `${(b.size / 1024).toFixed(1)} KB` : '-',
        createdAt: b.date || b.createdAt,
      })),
      ...systemBackups,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      backups: allBackups,
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao listar backups')
    return NextResponse.json(
      { success: false, error: 'Erro ao listar backups' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/backups - Cria novo backup
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const result = await BackupOrchestrator.runBackup('all')

    return NextResponse.json({
      success: result.errors.length === 0,
      message: result.errors.length === 0 ? 'Backup criado com sucesso' : result.errors.join('; '),
      backup: {
        googleDriveUploaded: result.systemBackup?.googleDriveUploaded,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao criar backup')
    return NextResponse.json(
      { success: false, error: 'Erro ao criar backup' },
      { status: 500 }
    )
  }
}
