/**
 * API de configurações de IA
 * GET - Retorna configurações atuais (sem expor API keys completas)
 * POST - Atualiza configurações
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SystemSettingsService, SettingCategory } from '@/lib/system-settings-service'
import { clearAIConfigCache } from '@/lib/ai-client'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Retorna configurações de IA
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const [
      provider,
      groqApiKey,
      groqModel,
      ollamaUrl,
      ollamaModel,
      enableAnonymization
    ] = await Promise.all([
      SystemSettingsService.get('AI_PROVIDER'),
      SystemSettingsService.get('GROQ_API_KEY'),
      SystemSettingsService.get('GROQ_MODEL'),
      SystemSettingsService.get('OLLAMA_URL'),
      SystemSettingsService.get('OLLAMA_MODEL'),
      SystemSettingsService.get('AI_ENABLE_ANONYMIZATION')
    ])

    // Mascarar API key
    const maskedGroqKey = groqApiKey 
      ? `${groqApiKey.substring(0, 8)}${'*'.repeat(20)}${groqApiKey.substring(groqApiKey.length - 4)}`
      : null

    return NextResponse.json({
      provider: provider || process.env.AI_PROVIDER || 'ollama',
      groqApiKey: maskedGroqKey,
      hasGroqKey: !!groqApiKey || !!process.env.GROQ_API_KEY,
      groqModel: groqModel || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      ollamaUrl: ollamaUrl || process.env.OLLAMA_URL || 'http://ollama:11434',
      ollamaModel: ollamaModel || process.env.OLLAMA_MODEL || 'qwen2.5:3b',
      enableAnonymization: enableAnonymization !== 'false',
      availableModels: {
        groq: [
          'llama-3.3-70b-versatile',
          'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768',
          'gemma2-9b-it'
        ],
        ollama: [
          'qwen2.5:3b',
          'qwen2.5:7b',
          'llama3.2:3b',
          'llama3.1:8b',
          'mistral:7b'
        ]
      }
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar configurações de IA')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Atualiza configurações de IA
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      provider,
      groqApiKey,
      groqModel,
      ollamaUrl,
      ollamaModel,
      enableAnonymization
    } = body

    // Validar provider
    if (provider && !['groq', 'ollama', 'openai'].includes(provider)) {
      return NextResponse.json({ error: 'Provedor inválido' }, { status: 400 })
    }

    // Salvar configurações
    const updates: Promise<void>[] = []

    if (provider !== undefined) {
      updates.push(
        SystemSettingsService.set('AI_PROVIDER', provider, {
          category: SettingCategory.SYSTEM,
          description: 'Provedor de IA (groq, ollama, openai)'
        })
      )
    }

    // Só atualizar API key se não for mascarada
    if (groqApiKey && !groqApiKey.includes('*')) {
      updates.push(
        SystemSettingsService.set('GROQ_API_KEY', groqApiKey, {
          category: SettingCategory.SECURITY,
          description: 'API Key do Groq',
          encrypted: true
        })
      )
    }

    if (groqModel !== undefined) {
      updates.push(
        SystemSettingsService.set('GROQ_MODEL', groqModel, {
          category: SettingCategory.SYSTEM,
          description: 'Modelo do Groq'
        })
      )
    }

    if (ollamaUrl !== undefined) {
      updates.push(
        SystemSettingsService.set('OLLAMA_URL', ollamaUrl, {
          category: SettingCategory.SYSTEM,
          description: 'URL do Ollama'
        })
      )
    }

    if (ollamaModel !== undefined) {
      updates.push(
        SystemSettingsService.set('OLLAMA_MODEL', ollamaModel, {
          category: SettingCategory.SYSTEM,
          description: 'Modelo do Ollama'
        })
      )
    }

    if (enableAnonymization !== undefined) {
      updates.push(
        SystemSettingsService.set('AI_ENABLE_ANONYMIZATION', String(enableAnonymization), {
          category: SettingCategory.SECURITY,
          description: 'Ativar anonimização LGPD para IA cloud'
        })
      )
    }

    await Promise.all(updates)

    // Limpar cache para aplicar novas configurações
    clearAIConfigCache()

    logger.info({ 
      userId: session.user.id,
      provider,
      groqModel,
      ollamaModel,
      enableAnonymization
    }, 'Configurações de IA atualizadas')

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso' })
  } catch (error) {
    logger.error({ error }, 'Erro ao salvar configurações de IA')
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
