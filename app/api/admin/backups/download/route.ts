import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/backups/download
 * Faz download de um backup específico
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

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename || !filename.startsWith('healthcare_') || !filename.endsWith('.sql.gz')) {
      return NextResponse.json(
        { error: 'Nome de arquivo inválido' },
        { status: 400 }
      )
    }

    const backupDir = process.env.BACKUPS_DIR || '/app/backups'
    const filePath = path.join(backupDir, filename)

    // Validação de segurança
    if (!filePath.startsWith(backupDir)) {
      return NextResponse.json(
        { error: 'Caminho inválido' },
        { status: 400 }
      )
    }

    try {
      // Verificar que o arquivo existe
      const stats = await stat(filePath)

      // Ler arquivo
      const data = await readFile(filePath)

      // Retornar com headers corretos
      return new NextResponse(data as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': stats.size.toString(),
        },
      })
    } catch (err: any) {
      console.error('[Backup Download] File error:', err)
      if (err.code === 'ENOENT') {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Erro ao ler arquivo' }, { status: 500 })
    }
  } catch (error) {
    console.error('[Backup Download] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer download' },
      { status: 500 }
    )
  }
}
