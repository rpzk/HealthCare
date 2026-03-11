import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/backups/files - Lista arquivos de backup de entidades
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const backupDir = process.env.BACKUP_DIR || './backups'
    try {
      const files = readdirSync(backupDir)
      const items = files
        .filter((f) => f.endsWith('.json') || f.endsWith('.zip') || f.includes('entity'))
        .map((file) => {
          const filePath = join(backupDir, file)
          const stats = statSync(filePath)
          return {
            filename: file,
            sizeHuman: `${(stats.size / 1024).toFixed(1)} KB`,
            createdAt: stats.mtime,
          }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json({ success: true, items })
    } catch {
      return NextResponse.json({ success: true, items: [] })
    }
  } catch {
    return NextResponse.json({ success: true, items: [] })
  }
}
