/**
 * API para gerenciar configurações do sistema
 * Acesso restrito a administradores
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SystemSettingsService, SettingCategory } from '@/lib/system-settings-service'

export const runtime = 'nodejs'

/**
 * GET /api/system/settings - Lista configurações
 * Query params:
 *   - category: filtrar por categoria
 *   - publicOnly: apenas públicas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Apenas admins podem ver configurações
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingCategory | null
    const publicOnly = searchParams.get('publicOnly') === 'true'

    const settings = await SystemSettingsService.list({
      category: category || undefined,
      publicOnly,
      includeEncrypted: false, // Nunca expor valores criptografados
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error: any) {
    console.error('Erro ao listar configurações:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar configurações' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/system/settings - Criar/atualizar configuração
 * Body: { key, value, description?, category?, isPublic?, encrypted? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value, description, category, isPublic, encrypted } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key e value são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar que não tentam criar secrets críticos via API
    const criticalKeys = [
      'ENCRYPTION_KEY',
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'RECORDING_ENCRYPTION_KEY',
      'CRON_SECRET',
    ]

    if (criticalKeys.includes(key)) {
      return NextResponse.json(
        {
          error: `A chave ${key} não pode ser gerenciada via API por questões de segurança. Use .env.`,
        },
        { status: 403 }
      )
    }

    await SystemSettingsService.set(key, value, {
      description,
      category,
      isPublic,
      encrypted,
      updatedBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/system/settings - Atualizar múltiplas configurações
 * Body: { settings: [{ key, value, encrypted?, description?, category? }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { error: 'settings deve ser um array não vazio' },
        { status: 400 }
      )
    }

    // Validar que não tentam atualizar secrets críticos
    const criticalKeys = [
      'ENCRYPTION_KEY',
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'RECORDING_ENCRYPTION_KEY',
      'CRON_SECRET',
    ]

    const hasCritical = settings.some((s) => criticalKeys.includes(s.key))
    if (hasCritical) {
      return NextResponse.json(
        {
          error: 'Não é possível atualizar secrets críticos via API. Use .env.',
        },
        { status: 403 }
      )
    }

    await SystemSettingsService.setMany(settings, session.user.id)

    return NextResponse.json({
      success: true,
      message: `${settings.length} configurações atualizadas com sucesso`,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/system/settings?key=CHAVE - Remove configuração
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
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'key é obrigatório' }, { status: 400 })
    }

    // Validar que não tentam deletar secrets críticos
    const criticalKeys = [
      'ENCRYPTION_KEY',
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'RECORDING_ENCRYPTION_KEY',
      'CRON_SECRET',
    ]

    if (criticalKeys.includes(key)) {
      return NextResponse.json(
        {
          error: `A chave ${key} não pode ser removida via API por questões de segurança.`,
        },
        { status: 403 }
      )
    }

    await SystemSettingsService.delete(key)

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao remover configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover configuração' },
      { status: 500 }
    )
  }
}
