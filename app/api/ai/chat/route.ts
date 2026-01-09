import { NextResponse } from 'next/server'
import { validateRequestBody } from '@/lib/with-auth'
import { withMedicalAIAuth } from '@/lib/advanced-auth-v2'
import ollamaClient from '@/lib/ollama-client'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms, TermsNotAcceptedError, TermsNotConfiguredError } from '@/lib/terms-enforcement'

// Schema de validação para chat IA
const aiChatSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória').max(5000, 'Mensagem muito longa'),
  type: z.enum(['medical_consultation', 'symptom_analysis', 'drug_interaction', 'general'], {
    errorMap: () => ({ message: 'Tipo deve ser medical_consultation, symptom_analysis, drug_interaction ou general' })
  }).default('general'),
  patientId: z.string().optional()
})

function validateAiChat(data: any) {
  const result = aiChatSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// POST - Chat com IA médica (apenas médicos)
export const POST = withMedicalAIAuth(async (request, { user }) => {
  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: user.id,
      audience: TermAudience.PROFESSIONAL,
      gates: ['AI'],
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
      return NextResponse.json(
        { error: e.message, code: e.code, missing: e.missing },
        { status: 503 }
      )
    }
    throw e
  }

  const validation = await validateRequestBody(request, validateAiChat)
  if (!validation.success) {
    return validation.response!
  }

  const { message, type, patientId } = validation.data!

  if (patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { userId: true } })
    if (patient?.userId) {
      try {
        await assertUserAcceptedTerms({
          prisma,
          userId: patient.userId,
          audience: TermAudience.PATIENT,
          gates: ['AI'],
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
          return NextResponse.json(
            { error: e.message, code: e.code, missing: e.missing },
            { status: 503 }
          )
        }
        throw e
      }
    }
  }
  // Seleciona o modelo configurado no ambiente (padrão definido no cliente)
  const model = ollamaClient.getGenerativeModel({ model: process.env.OLLAMA_MODEL })

  // Contexto médico personalizado baseado no tipo
  let systemPrompt = ''
  
  switch (type) {
    case 'medical_consultation':
      systemPrompt = `Você é um assistente médico especializado com conhecimento em:
- Diagnóstico diferencial baseado em sintomas
- Análise de exames laboratoriais e de imagem
- Prescrição e interações medicamentosas
- Protocolos clínicos atualizados
- Medicina baseada em evidências

IMPORTANTE: 
- Sempre inclua disclaimers sobre a necessidade de avaliação médica presencial
- Base suas respostas em literatura médica reconhecida
- Se não souber algo, seja honesto sobre as limitações
- Priorize a segurança do paciente em todas as recomendações
- Use terminologia médica adequada mas acessível

Responda de forma estruturada, clara e profissional.`
      break
      
      break
    
    case 'symptom_analysis':
      systemPrompt = `Você é um especialista em análise de sintomas. Ao analisar sintomas:
- Liste possíveis diagnósticos por ordem de probabilidade
- Inclua diagnósticos diferenciais importantes
- Sugira exames complementares necessários
- Identifique sinais de alerta (red flags)
- Forneça orientações para acompanhamento

Sempre inclua o disclaimer sobre avaliação médica presencial.`
      break
    
    case 'drug_interaction':
      systemPrompt = `Você é um farmacologista clínico especialista em interações medicamentosas:
- Analise interações graves, moderadas e leves
- Explique mecanismos de interação quando relevante
- Sugira alternativas terapêuticas se necessário
- Indique necessidade de monitoramento específico
- Forneça recomendações de ajuste de dose quando aplicável`
      break
    
    default:
      systemPrompt = `Você é um assistente médico geral. Forneça informações médicas precisas, sempre com os devidos disclaimers sobre a necessidade de avaliação médica profissional.`
  }

  const fullPrompt = `${systemPrompt}

Pergunta do usuário: ${message}

Por favor, responda de forma profissional e detalhada:`

  try {
    const result = await model.generateContent(fullPrompt)
    const response = result.response.text()

    // Log de auditoria
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'chat',
      {
        type,
        patientId,
        messageLength: message.length,
        responseLength: response.length
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        response: response,
        type: type,
        timestamp: new Date().toISOString()
      },
      metadata: {
        responseBy: user.email,
        messageLength: message.length,
        responseLength: response.length,
        patientId
      }
    })
  } catch (error) {
    console.error('Erro na API de chat:', error)
    
    // Log de auditoria para erro
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'chat',
      error instanceof Error ? error.message : 'Erro desconhecido',
      {
        type,
        patientId,
        messageLength: message.length
      }
    )

    return NextResponse.json({
      success: false,
      error: {
        message: 'Serviço de IA temporariamente indisponível',
        details: 'O assistente médico está fora do ar no momento. Tente novamente em alguns minutos.',
        code: 'AI_SERVICE_UNAVAILABLE'
      },
      metadata: {
        responseBy: user.email,
        messageLength: message.length,
        patientId,
        timestamp: new Date().toISOString()
      }
    }, { status: 503 })
  }
})
