import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { SystemSettingsService, SettingCategory } from '@/lib/system-settings-service'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
  TermsNotAcceptedError,
  TermsNotConfiguredError,
} from '@/lib/terms-enforcement'

export async function GET() {
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
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
    }
    throw e
  }

  const [folderId, serviceAccountJson] = await Promise.all([
    SystemSettingsService.get('GDRIVE_FOLDER_ID'),
    SystemSettingsService.get('GDRIVE_SERVICE_ACCOUNT_JSON'),
  ])

  return NextResponse.json({
    success: true,
    configured: Boolean(serviceAccountJson && folderId),
    folderId: folderId || '',
  })
}

export async function PUT(request: NextRequest) {
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
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
    }
    throw e
  }

  const body = await request.json()
  const { serviceAccountJson, folderId } = body || {}

  if (!serviceAccountJson || !folderId) {
    return NextResponse.json({ error: 'serviceAccountJson e folderId são obrigatórios' }, { status: 400 })
  }

  await SystemSettingsService.set('GDRIVE_SERVICE_ACCOUNT_JSON', serviceAccountJson, {
    encrypted: true,
    category: SettingCategory.STORAGE,
    isPublic: false,
    updatedBy: session.user.id,
  })

  await SystemSettingsService.set('GDRIVE_FOLDER_ID', folderId, {
    encrypted: false,
    category: SettingCategory.STORAGE,
    isPublic: false,
    updatedBy: session.user.id,
  })

  SystemSettingsService.clearCache('GDRIVE_SERVICE_ACCOUNT_JSON')
  SystemSettingsService.clearCache('GDRIVE_FOLDER_ID')

  return NextResponse.json({ success: true, message: 'Credenciais salvas com sucesso' })
}
