import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/admin/backups/restore
 * Restaura um backup específico
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

    const body = await request.json()
    const { filename } = body

    if (!filename || !filename.startsWith('healthcare_') || !filename.endsWith('.sql.gz')) {
      return NextResponse.json(
        { error: 'Nome de arquivo inválido' },
        { status: 400 }
      )
    }

    // Validação de segurança
    const backupDir = '/home/umbrel/backups/healthcare'
    const filePath = `${backupDir}/${filename}`

    if (!filePath.startsWith(backupDir)) {
      return NextResponse.json(
        { error: 'Caminho inválido' },
        { status: 400 }
      )
    }

    try {
      // Executar script de restauração
      const restoreScript = `bash /home/umbrel/HealthCare/scripts/restore-database.sh "${filename}"`

      console.log('[Restore] Iniciando restauração:', filename)

      const { stdout, stderr } = await execAsync(restoreScript)

      console.log('[Restore] Sucesso')
      console.log(stdout)

      return NextResponse.json({
        success: true,
        message: 'Backup restaurado com sucesso! O banco de dados foi revertido.',
        details: stdout,
      })
    } catch (err: any) {
      console.error('[Restore] Erro ao executar script:', err)
      return NextResponse.json(
        {
          success: false,
          error: err.message || 'Erro ao restaurar backup',
          stderr: err.stderr,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Backups Restore] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar backup' },
      { status: 500 }
    )
  }
}
