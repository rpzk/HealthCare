import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

const BASE_DIR = process.env.BACKUPS_DIR || '/app/backups'
const ALLOWED_PREFIXES = ['patient_', 'user_', 'professional_']

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { filename } = await request.json()

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename inválido' }, { status: 400 })
    }

    if (!ALLOWED_PREFIXES.some(p => filename.startsWith(p))) {
      return NextResponse.json({ error: 'Prefixo não permitido' }, { status: 400 })
    }

    const fullPath = path.join(BASE_DIR, filename)
    await fs.unlink(fullPath)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[Delete File] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao deletar arquivo' }, { status: 500 })
  }
}
