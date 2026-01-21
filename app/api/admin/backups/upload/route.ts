import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { SystemSettingsService } from '@/lib/system-settings-service'
import path from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const filename: string | undefined = body?.filename

    if (!filename || !filename.startsWith('healthcare_') || !filename.endsWith('.sql.gz')) {
      return NextResponse.json({ error: 'Nome de arquivo inválido' }, { status: 400 })
    }

    const timestamp = filename.replace('healthcare_', '').replace('.sql.gz', '')
    if (!/^\d{14}$/.test(timestamp)) {
      return NextResponse.json({ error: 'Timestamp inválido no nome do arquivo' }, { status: 400 })
    }

    const backupDir = process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare')
    const filePath = path.join(backupDir, filename)

    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: 'Arquivo de backup não encontrado' }, { status: 404 })
    }

    const [gdriveServiceAccountJson, gdriveFolderId, gdriveImpersonate] = await Promise.all([
      SystemSettingsService.get('GDRIVE_SERVICE_ACCOUNT_JSON'),
      SystemSettingsService.get('GDRIVE_FOLDER_ID'),
      SystemSettingsService.get('GDRIVE_IMPERSONATE_EMAIL'),
    ])

    if (!gdriveServiceAccountJson || !gdriveFolderId) {
      return NextResponse.json({ error: 'Google Drive não configurado' }, { status: 400 })
    }

    // Gravar credencial temporária e config do rclone
    const os = await import('os')
    const saTempFile = path.join(os.tmpdir(), `gdrive-sa-${Date.now()}.json`)
    const rcloneConfig = path.join(os.tmpdir(), `rclone-${Date.now()}.conf`)

    try {
      await fs.writeFile(saTempFile, gdriveServiceAccountJson, 'utf8')
      const rcloneConfContent = `\n[gdrive]\ntype = drive\nscope = drive\nservice_account_file = ${saTempFile}\n`
      await fs.writeFile(rcloneConfig, rcloneConfContent, 'utf8')

      const includeArgs = [
        `--include=healthcare_${timestamp}.sql.gz`,
        `--include=config_${timestamp}.tar.gz`,
        `--include=certs_${timestamp}.tar.gz`,
        `--include=manifest_${timestamp}.json`,
        `--exclude=*.log`,
      ]

      const logFile = path.join(backupDir, `rclone_reupload_${timestamp}.log`)
      const cmd = [
        'rclone',
        'copy',
        backupDir,
        'gdrive:',
        `--config=${rcloneConfig}`,
        `--drive-root-folder-id=${gdriveFolderId}`,
        ...(gdriveImpersonate ? [`--drive-impersonate=${gdriveImpersonate}`] : []),
        '--transfers=2',
        '--checkers=4',
        '--fast-list',
        `--log-file=${logFile}`,
        '--log-level=INFO',
        ...includeArgs,
      ].join(' ')

      const { stdout, stderr } = await execAsync(cmd, { env: process.env })
      // Atualizar status JSON se existir
      const statusFile = path.join(backupDir, `status_${timestamp}.json`)
      try {
        const raw = await fs.readFile(statusFile, 'utf8')
        const json = JSON.parse(raw)
        json.googleDriveUploaded = true
        await fs.writeFile(statusFile, JSON.stringify(json, null, 2), 'utf8')
      } catch {
        // Se não existir, cria um básico
        const json = {
          timestamp,
          dbBackupFile: filename,
          googleDriveFolderId: gdriveFolderId,
          googleDriveUploaded: true,
        }
        await fs.writeFile(statusFile, JSON.stringify(json, null, 2), 'utf8')
      }

      return NextResponse.json({ success: true, message: 'Backup reenviado ao Google Drive com sucesso.' })
    } catch (e: any) {
      logger.error('[Backup Upload] Error:', e)
      return NextResponse.json({ success: false, error: e?.message || 'Falha no upload para o Drive' }, { status: 500 })
    } finally {
      // Limpeza de temporários
      try { await fs.unlink(saTempFile) } catch {}
      try { await fs.unlink(rcloneConfig) } catch {}
    }
  } catch (error) {
    logger.error('[Backups Upload POST] Error:', error)
    return NextResponse.json({ error: 'Erro ao reenviar backup' }, { status: 500 })
  }
}
