import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import aiService from '@/lib/ai-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Schema de validação para geração de resumo médico
const medicalSummarySchema = z.object({
  patientId: z.string().uuid("ID do paciente deve ser um UUID válido"),
  consultationIds: z.array(z.string().uuid("IDs das consultas devem ser UUIDs válidos")).optional(),
  includePrescriptions: z.boolean().default(true),
  includeLabs: z.boolean().default(true),
  includeHistory: z.boolean().default(true),
  timeFrame: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  format: z.enum(['brief', 'detailed', 'discharge']).default('detailed'),
  language: z.enum(['pt', 'en']).default('pt')
})

/**
 * POST /api/ai/medical-summary
 * Gera resumo médico completo do paciente usando IA
 * Requer autenticação de médico
 */
export const POST = withDoctorAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    
    // Validação com Zod
    const validationResult = medicalSummarySchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.AI_ANALYSIS,
        'Medical Summary',
        `Dados inválidos: ${errors}`,
        { patientId: body.patientId, errors }
      )
      
      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const {
      patientId,
      consultationIds,
      includePrescriptions,
      includeLabs,
      includeHistory,
      timeFrame,
      format,
      language
    } = validationResult.data

    // Gerar resumo médico usando IA
    const summary = await aiService.generateMedicalSummary(
      { patientId, timeFrame, format, language },
      consultationIds || []
    )

    // Log de sucesso
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_ANALYSIS,
      'Medical Summary',
      {
        patientId,
        format,
        timeFrame,
        includePrescriptions,
        includeLabs,
        includeHistory,
        language,
        summaryLength: summary.length,
        generatedAt: new Date().toISOString()
      }
    )

    return NextResponse.json({
      success: true,
      summary,
      metadata: {
        patientId,
        format,
        timeFrame,
        generatedAt: new Date().toISOString(),
        generatedBy: user.name
      }
    })

  } catch (error: any) {
    console.error('Erro ao gerar resumo médico:', error)

    // Log de erro
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_ANALYSIS,
      'Medical Summary',
      error.message,
      { error: error.message }
    )

    // Tratamento específico de erros
    if (error.message?.includes('Patient not found') || error.message?.includes('Paciente não encontrado')) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    if (error.message?.includes('Insufficient data') || error.message?.includes('Dados insuficientes')) {
      return NextResponse.json(
        { error: 'Dados insuficientes para gerar resumo médico. Verifique se o paciente possui consultas e histórico médico.' },
        { status: 422 }
      )
    }

    if (error.message?.includes('AI service unavailable')) {
      return NextResponse.json(
        { error: 'Serviço de IA temporariamente indisponível. Tente novamente em alguns momentos.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor ao gerar resumo médico' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
