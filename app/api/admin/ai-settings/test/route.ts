/**
 * API para testar conexão com serviço de IA
 * GET - Retorna status da conexão
 * POST - Testa com uma pergunta simples
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { aiClient } from '@/lib/ai-client'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Health check
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const health = await aiClient.healthCheck()
    const info = await aiClient.getInfo()

    return NextResponse.json({
      ...health,
      ...info
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao verificar saúde da IA')
    return NextResponse.json({ ok: false, error: 'Erro ao verificar conexão' }, { status: 500 })
  }
}

// POST - Teste de conexão com prompt
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt } = body

    const testPrompt = prompt || 'Responda apenas com "OK" se você está funcionando corretamente.'

    const startTime = Date.now()
    const response = await aiClient.chat({
      messages: [
        { role: 'system', content: 'Você é um assistente de teste. Responda de forma breve.' },
        { role: 'user', content: testPrompt }
      ],
      max_tokens: 100,
      skipAnonymization: true // Não precisa anonimizar teste
    })
    const duration = Date.now() - startTime

    const info = await aiClient.getInfo()

    logger.info({ 
      userId: session.user.id,
      provider: info.provider,
      model: info.model,
      duration,
      tokens: response.usage?.total_tokens
    }, 'Teste de IA realizado com sucesso')

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
      provider: info.provider,
      responseTime: duration,
      anonymizationEnabled: info.anonymizationEnabled,
      usage: response.usage
    })
  } catch (error: any) {
    logger.error({ error: error.message }, 'Erro ao testar IA')
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao testar conexão com IA'
    }, { status: 500 })
  }
}
