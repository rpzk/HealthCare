/**
 * API para testar a anonimização LGPD
 * POST - Recebe texto e retorna versão anonimizada com estatísticas
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { anonymizeText, hasSensitiveData } from '@/lib/lgpd-anonymizer'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { text, knownNames } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 })
    }

    // Verificar se tem dados sensíveis
    const hasData = hasSensitiveData(text)

    // Anonimizar
    const result = anonymizeText(text, knownNames)

    // Calcular estatísticas
    const totalReplacements = result.replacements.length
    const byType = result.replacements.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Criar mapa de substituições para UI
    const replacementsMap: Record<string, string> = {}
    result.replacements.forEach(r => {
      replacementsMap[r.replacement] = r.original
    })

    // Tipos detectados únicos
    const detectedTypes = [...new Set(result.replacements.map(r => r.type))]

    logger.info({ 
      userId: session.user.id,
      originalLength: text.length,
      anonymizedLength: result.anonymizedText.length,
      replacements: totalReplacements,
      byType
    }, 'Teste de anonimização LGPD realizado')

    return NextResponse.json({
      original: text,
      anonymized: result.anonymizedText,
      replacements: replacementsMap,
      detectedTypes,
      isAnonymized: result.hadSensitiveData,
      // Dados detalhados para debug
      details: {
        hadSensitiveData: result.hadSensitiveData,
        totalReplacements,
        byType,
        allReplacements: result.replacements.map(r => ({
          type: r.type,
          original: r.original,
          replacement: r.replacement
        }))
      }
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao testar anonimização')
    return NextResponse.json({ error: 'Erro ao processar texto' }, { status: 500 })
  }
}
