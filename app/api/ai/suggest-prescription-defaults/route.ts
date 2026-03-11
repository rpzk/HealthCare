/**
 * API de sugestão de valores padrão para prescrição (uso costumeiro)
 *
 * POST /api/ai/suggest-prescription-defaults
 *
 * Body: { medicationName, patientAge?, patientSex?, form?, catalogDosage?, catalogFrequency?, catalogDuration? }
 *
 * Retorna: { dosage, frequency, duration, instructions, activeIngredient?, prescriptionType? } ou null se IA indisponível
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig, aiClient } from '@/lib/ai-client'
import { logger } from '@/lib/logger'

function extractJsonFromResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]
  const toParse = jsonBlock ?? trimmed
  try {
    return JSON.parse(toParse) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      medicationName,
      patientAge,
      patientSex,
      form,
      catalogDosage,
      catalogFrequency,
      catalogDuration,
    } = body as {
      medicationName?: string
      patientAge?: number
      patientSex?: string
      form?: string
      catalogDosage?: string
      catalogFrequency?: string
      catalogDuration?: string
    }

    if (!medicationName || typeof medicationName !== 'string') {
      return NextResponse.json(
        { error: 'medicationName é obrigatório' },
        { status: 400 }
      )
    }

    const config = await getAIConfig()
    const hasCloud = config.provider === 'groq' && config.groqApiKey
    const hasLocal = config.provider === 'ollama'
    if (!hasCloud && !hasLocal) {
      return NextResponse.json(null)
    }

    const catalogHint =
      catalogDosage || catalogFrequency || catalogDuration
        ? ` O catálogo sugere: dosagem "${catalogDosage || '-'}", frequência "${catalogFrequency || '-'}", duração "${catalogDuration || '-'}". Use como referência mas priorize o uso clínico habitual.`
        : ''

    const userPrompt = `Para o medicamento "${medicationName}"${form ? ` (forma: ${form})` : ''}, identifique o PRINCÍPIO ATIVO (quando existir) e sugira posologia de uso habitual.

DADOS OPCIONAIS: Idade ${patientAge ?? 'não informada'}, Sexo ${patientSex ?? 'não informado'}.${catalogHint}

Retorne APENAS um JSON válido, sem texto antes ou depois:
{"recognized":true,"confidence":"high|medium|low","dosage":"ex: 500mg ou 1 comprimido","frequency":"ex: 8/8h ou 1x ao dia","duration":"ex: 7 dias ou uso contínuo","instructions":"ex: Tomar com alimentos","activeIngredient":"nome genérico/princípio ativo, ex: Metilfenidato","prescriptionType":"um de: SIMPLE, ANTIMICROBIAL, CONTROLLED_A, CONTROLLED_B, CONTROLLED_B2, CONTROLLED_C1, CONTROLLED_C2, CONTROLLED_C4, CONTROLLED_C5, CONTROLLED_TALIDOMIDA","reason":"motivo quando não reconhecido"}

Se não reconhecer com segurança, use recognized=false, confidence="low" e deixe dosage/frequency/duration vazios.
Seja conciso. Use padrões de prescrição brasileiros.`

    const response = await aiClient.chat({
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente para prescrição médica. Responda SOMENTE com JSON válido no formato solicitado. Não use markdown. Valores em português do Brasil.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 256,
      temperature: 0.2,
      skipAnonymization: true,
    })

    const parsed = extractJsonFromResponse(response.content)

    if (!parsed) {
      // Tentar extrair json parcial ou falhar silenciosamente
      return NextResponse.json(null)
    }

    // Compatibilidade: se a IA não retornar recognized/confidence, inferir se os dados são úteis
    let recognized = parsed.recognized === true
    let confidence = typeof parsed.confidence === 'string' ? parsed.confidence.toLowerCase() : 'low'

    const dosage = typeof parsed.dosage === 'string' ? parsed.dosage.trim() : ''
    const frequency = typeof parsed.frequency === 'string' ? parsed.frequency.trim() : ''
    const duration = typeof parsed.duration === 'string' ? parsed.duration.trim() : ''

    // Se a IA retornou dados preenchidos mas esqueceu as flags de confiança, aceitar como válido
    if ((!recognized || confidence === 'low') && dosage && frequency && duration) {
      recognized = true
      confidence = 'medium'
    }

    if (!recognized || confidence === 'low') {
      return NextResponse.json(null)
    }

    if (!dosage || !frequency || !duration) {
      return NextResponse.json(null)
    }

    const aiPrescriptionTypeRaw = typeof parsed.prescriptionType === 'string' ? parsed.prescriptionType.toUpperCase().trim() : ''
    const allowedTypes = new Set([
      'SIMPLE',
      'ANTIMICROBIAL',
      'CONTROLLED_A',
      'CONTROLLED_B',
      'CONTROLLED_B2',
      'CONTROLLED_C1',
      'CONTROLLED_C2',
      'CONTROLLED_C4',
      'CONTROLLED_C5',
      'CONTROLLED_TALIDOMIDA',
    ])
    const prescriptionType = allowedTypes.has(aiPrescriptionTypeRaw) ? aiPrescriptionTypeRaw : undefined

    const result = {
      dosage,
      frequency,
      duration,
      instructions: String(parsed.instructions ?? ''),
      activeIngredient: parsed.activeIngredient ? String(parsed.activeIngredient) : undefined,
      prescriptionType,
    }

    return NextResponse.json(result)
  } catch (err) {
    logger.warn({ err }, 'Sugestão de posologia por IA falhou')
    return NextResponse.json(null)
  }
}
