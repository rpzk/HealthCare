import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import path from 'path'
import { stat, readFile } from 'fs/promises'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const BASE_DIR = '/home/umbrel/backups/healthcare'
const ALLOWED_PREFIXES = ['patient_', 'user_', 'professional_', 'config_', 'manifest_']
const ALLOWED_EXTS = ['.json', '.tar.gz', '.pdf']

function getContentType(filename: string): string {
  if (filename.endsWith('.json')) return 'application/json'
  if (filename.endsWith('.tar.gz')) return 'application/gzip'
  if (filename.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') || ''
    if (!filename) return NextResponse.json({ error: 'filename obrigatório' }, { status: 400 })

    const prefixOk = ALLOWED_PREFIXES.some(p => filename.startsWith(p))
    const extOk = ALLOWED_EXTS.some(ext => filename.endsWith(ext))
    if (!prefixOk || !extOk) {
      return NextResponse.json({ error: 'Arquivo não permitido' }, { status: 400 })
    }

    const filePath = path.join(BASE_DIR, filename)
    if (!filePath.startsWith(BASE_DIR)) {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
    }

    const stats = await stat(filePath)
    const data = await readFile(filePath)

    return new NextResponse(data as any, {
      status: 200,
      headers: {
        'Content-Type': getContentType(filename),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    })
  } catch (e: any) {
    logger.error('[Backups Files Download] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao baixar arquivo' }, { status: 500 })
  }
}
