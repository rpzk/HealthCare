import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { backupService } from '@/lib/backup-service';
import { logger } from '@/lib/logger'

/**
 * POST /api/backup/trigger
 * Dispara backup manual (apenas ADMIN)
 */
export async function POST(request: NextRequest) {
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
        { error: 'Apenas administradores podem executar backup' },
        { status: 403 }
      );
    }

    logger.info(`[Backup] Disparado manualmente por ${session.user.email}`);

    const result = await backupService.runFullBackup();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Backup concluído com sucesso',
        data: {
          timestamp: result.timestamp,
          dbSizeMB: result.size.dbMB,
          filesSizeMB: result.size.filesMB,
          s3Uploaded: result.s3Uploaded,
          googleDriveUploaded: result.googleDriveUploaded
        }
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Backup concluído com erros',
        errors: result.errors,
        data: {
          dbSizeMB: result.size.dbMB,
          filesSizeMB: result.size.filesMB
        }
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('[Backup] Erro ao executar:', error);
    return NextResponse.json(
      { error: 'Erro ao executar backup' },
      { status: 500 }
    );
  }
}
