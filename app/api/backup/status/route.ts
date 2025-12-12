import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/backup/status
 * Lista backups existentes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const backupDir = process.env.BACKUP_DIR || './backups';
    const files = readdirSync(backupDir);

    const backups = files.map(file => {
      const filePath = join(backupDir, file);
      const stats = statSync(filePath);

      return {
        filename: file,
        sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
        createdAt: stats.birthtime,
        type: file.includes('db_backup') ? 'database' : 'files'
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      backups,
      totalCount: backups.length,
      totalSizeMB: Math.round(backups.reduce((sum, b) => sum + b.sizeMB, 0) * 100) / 100
    }, { status: 200 });
  } catch (error) {
    console.error('[Backup] Erro ao listar:', error);
    return NextResponse.json(
      { error: 'Erro ao listar backups' },
      { status: 500 }
    );
  }
}
