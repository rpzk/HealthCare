import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

const BASE_DIR = process.env.BACKUPS_DIR || '/app/backups'
const ALLOWED_PREFIXES = ['patient_', 'user_', 'professional_']

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const entries = await fs.readdir(BASE_DIR, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && ALLOWED_PREFIXES.some(p => e.name.startsWith(p)))
      .map(e => e.name)
      .sort((a, b) => b.localeCompare(a))

    const items = await Promise.all(
      files.map(async (name) => {
        const full = path.join(BASE_DIR, name)
        const stats = await fs.stat(full)
        return {
          filename: name,
          size: stats.size,
          createdAt: stats.mtime,
          sizeHuman: `${Math.round(stats.size / 1024)} KB`,
          type: name.endsWith('.pdf') ? 'PDF' : name.endsWith('.json') ? 'JSON' : 'Outro',
        }
      })
    )

    return NextResponse.json({ success: true, items })
  } catch (e: any) {
    console.error('[Backups Files] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao listar arquivos' }, { status: 500 })
  }
}
