import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/backups/config - Configuração do Google Drive
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

    const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER || null
    const configured = Boolean(process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_DRIVE_BACKUP_FOLDER)

    return NextResponse.json({
      success: true,
      configured,
      folderId: folderId || '',
      impersonateEmail: process.env.GOOGLE_DRIVE_IMPERSONATE || '',
    })
  } catch {
    return NextResponse.json({
      success: true,
      configured: false,
      folderId: '',
      impersonateEmail: '',
    })
  }
}

/**
 * PUT /api/admin/backups/config - Salva configuração (persiste em system_settings)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { folderId, serviceAccountJson, impersonateEmail } = body

    await prisma.systemSetting.upsert({
      where: { key: 'backup_gdrive_folder_id' },
      create: { key: 'backup_gdrive_folder_id', value: String(folderId || '') },
      update: { value: String(folderId || '') },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
