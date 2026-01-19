import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, stat } from 'fs/promises'
import path from 'path'
import { SystemSettingsService } from '@/lib/system-settings-service'
import { promises as fs } from 'fs'

const execAsync = promisify(exec)

/**
 * GET /api/admin/backups
 * Lista todos os backups disponíveis
 * Apenas ADMIN
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const backupDir = process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare')

    try {
      const files = await readdir(backupDir)
      
      const backups = await Promise.all(
        files
          .filter(f => f.endsWith('.sql.gz'))
          .map(async (f) => {
            try {
              const filePath = path.join(backupDir, f)
              const stats = await stat(filePath)
              const base = f.replace('.sql.gz','')
              const logCandidates = [
                `${base}.log`,
                f.startsWith('healthcare_') ? f.replace('.sql.gz', '.log') : `backup_${base.replace(/^.*_(\d{14})$/, '$1')}.log`,
              ]
              const logFile = logCandidates.find(l => files.includes(l)) || `${base}.log`
              const tsMatch = base.match(/(\d{14})$/)
              const statusFile = tsMatch ? `status_${tsMatch[1]}.json` : `status_${base}.json`
              const rcloneLog = tsMatch ? `rclone_${tsMatch[1]}.log` : undefined
              
              return {
                id: f,
                filename: f,
                size: stats.size,
                sizeHuman: formatBytes(stats.size),
                // Use mtime as birthtime may be unset on Linux
                createdAt: stats.mtime,
                hasLog: files.includes(logFile),
                googleDriveUploaded: files.includes(statusFile)
                  ? await readStatusBoolean(path.join(backupDir, statusFile), 'googleDriveUploaded')
                  : (rcloneLog && files.includes(rcloneLog) ? true : undefined),
              }
            } catch {
              return null
            }
          })
      )

      const validBackups = backups
        .filter((b) => b !== null)
        .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime())

      return NextResponse.json({
        success: true,
        count: validBackups.length,
        backups: validBackups,
      })
    } catch (err) {
      console.error('Error reading backup directory:', err)
      return NextResponse.json(
        { success: true, count: 0, backups: [], message: 'Nenhum backup encontrado' },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('[Backups] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao listar backups' },
      { status: 500 }
    )
  }
}

async function readStatusBoolean(filePath: string, key: string): Promise<boolean | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(raw)
    const v = json?.[key]
    return typeof v === 'boolean' ? v : undefined
  } catch {
    return undefined
  }
}

/**
 * POST /api/admin/backups
 * Cria novo backup manual
 * Apenas ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Executar script de backup completo
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup-complete.sh')

    const [gdriveServiceAccountJson, gdriveFolderId, gdriveImpersonate] = await Promise.all([
      SystemSettingsService.get('GDRIVE_SERVICE_ACCOUNT_JSON'),
      SystemSettingsService.get('GDRIVE_FOLDER_ID'),
      SystemSettingsService.get('GDRIVE_IMPERSONATE_EMAIL'),
    ])

    console.log('[Backup] Debug - SA length:', gdriveServiceAccountJson?.length || 0)
    console.log('[Backup] Debug - Folder ID:', gdriveFolderId?.substring(0, 20) || 'VAZIO')
    if (gdriveServiceAccountJson) {
      console.log('[Backup] Debug - SA is valid JSON:', 
        gdriveServiceAccountJson.includes('client_email') ? 'YES' : 'NO')
    }

    try {
      // Criar arquivo temporário com a credencial (evita truncamento de env var)
      const fs = require('fs/promises')
      const os = require('os')
      const tempSAFile = path.join(os.tmpdir(), `gdrive-sa-${Date.now()}.json`)
      
      if (gdriveServiceAccountJson) {
        await fs.writeFile(tempSAFile, gdriveServiceAccountJson, 'utf8')
        console.log('[Backup] Service Account salvo em:', tempSAFile)
      }

      const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
        env: {
          ...process.env,
          GDRIVE_SERVICE_ACCOUNT_FILE: gdriveServiceAccountJson ? tempSAFile : '',
          GDRIVE_FOLDER_ID: gdriveFolderId || '',
          APP_ROOT: process.cwd(),
          // Ensure pg_dump can connect inside container
          POSTGRES_HOST: 'postgres',
          POSTGRES_USER: 'healthcare',
          POSTGRES_DB: 'healthcare_db',
          POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',
          GDRIVE_IMPERSONATE: gdriveImpersonate || '',
        },
      })
      
      // Limpar arquivo temporário
      if (gdriveServiceAccountJson) {
        try {
          await fs.unlink(tempSAFile)
        } catch (e) {
          console.warn('[Backup] Erro ao deletar arquivo temp:', e)
        }
      }
      
      console.log('[Backup] Sucesso:', stdout)

      // Determinar o último backup pelo arquivo de log mais recente
      const backupDir = process.env.BACKUPS_DIR || '/app/backups'
      const files = await readdir(backupDir)
      const latestLog = files
        .filter(f => f.startsWith('backup_') && f.endsWith('.log'))
        .sort((a,b) => b.localeCompare(a))[0]
      let timestamp = latestLog ? latestLog.replace('backup_','').replace('.log','') : undefined
      const backupFile = timestamp ? `healthcare_${timestamp}.sql.gz` : undefined
      const statusFile = timestamp ? `status_${timestamp}.json` : undefined

      try {
        const stats = backupFile ? await stat(path.join(backupDir, backupFile)) : undefined
        const googleDriveUploaded = statusFile
          ? await readStatusBoolean(path.join(backupDir, statusFile), 'googleDriveUploaded')
          : undefined
        return NextResponse.json({
          success: true,
          message: 'Backup criado com sucesso!',
          backup: backupFile && stats ? {
            filename: backupFile,
            size: stats.size,
            sizeHuman: formatBytes(stats.size),
            createdAt: new Date(),
            googleDriveUploaded,
          } : undefined,
        })
      } catch {
        // Se não conseguir ler o arquivo, retornar sucesso mesmo assim
        return NextResponse.json({
          success: true,
          message: 'Backup iniciado. Verifique em alguns minutos.',
        })
      }
    } catch (err: any) {
      console.error('[Backup] Erro ao executar script:', err)
      return NextResponse.json(
        { success: false, error: err.message || 'Erro ao criar backup' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Backups POST] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar backup' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/backups
 * Deleta um backup específico
 * Apenas ADMIN
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename || !filename.startsWith('healthcare_') || !filename.endsWith('.sql.gz')) {
      return NextResponse.json(
        { error: 'Nome de arquivo inválido' },
        { status: 400 }
      )
    }

    // Validação de segurança: garantir que é um caminho seguro
    const backupDir = process.env.BACKUPS_DIR || path.join(process.cwd(), 'backups', 'healthcare')
    const filePath = path.join(backupDir, filename)

    if (!filePath.startsWith(backupDir)) {
      return NextResponse.json(
        { error: 'Caminho inválido' },
        { status: 400 }
      )
    }

    try {
      await execAsync(`rm -f "${filePath}" "${filePath.replace('.sql.gz', '.log')}"`)

      return NextResponse.json({
        success: true,
        message: 'Backup deletado com sucesso',
      })
    } catch (err: any) {
      console.error('[Backup Delete] Error:', err)
      return NextResponse.json(
        { error: 'Erro ao deletar backup' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Backups DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar backup' },
      { status: 500 }
    )
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
