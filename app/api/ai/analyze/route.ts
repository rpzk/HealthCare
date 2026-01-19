import { NextResponse } from 'next/server'
import { withDoctorAuth, validateRequestBody } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { MedicalAIService } from '@/lib/ai-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Schema de validação para análise médica geral
const medicalAnalysisSchema = z.object({
  symptoms: z.array(z.string().min(1, 'Descrição do sintoma é obrigatória')).min(1, 'Pelo menos um sintoma/medicamento é obrigatório'),
  patientHistory: z.string().optional(),
  context: z.string().optional(),
  analysisType: z.enum(['symptoms', 'drug_interactions'], {
    errorMap: () => ({ message: 'Tipo deve ser symptoms ou drug_interactions' })
  }).default('symptoms'),
  patientId: z.string().optional()
})

function validateMedicalAnalysis(data: any) {
  const result = medicalAnalysisSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// POST - Análise médica geral (apenas médicos)
export const POST = withDoctorAuth(async (request, { user }) => {
  const limit = rateLimiters.aiMedical(request, user.id)
  if (limit && 'allowed' in limit === false) {
    return limit as any
  }
  const validation = await validateRequestBody(request, validateMedicalAnalysis)
  if (!validation.success) {
    return validation.response!
  }

  const { symptoms, patientHistory, context, analysisType, patientId } = validation.data!

  let result
  let actionDescription = ''

  switch (analysisType) {
    case 'symptoms':
      actionDescription = 'Análise de sintomas médicos'
      result = await MedicalAIService.analyzeSymptoms(symptoms, patientHistory, context)
      break
    
    case 'drug_interactions':
      actionDescription = 'Verificação de interações medicamentosas'
      result = await MedicalAIService.checkDrugInteractions(symptoms)
      break
  }

  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'general-analysis',
    {
      analysisType,
      patientId,
      symptomsCount: symptoms.length,
      hasHistory: !!patientHistory,
      hasContext: !!context
    }
  )

  const resp = NextResponse.json({
    success: true,
    data: {
      analysis: result,
      type: analysisType
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      analyzedBy: user.email,
      analysisType,
      symptomsCount: symptoms.length,
      patientId
    }
  })
  if (limit && 'headers' in limit) {
    Object.entries(limit.headers).forEach(([k,v]) => resp.headers.set(k, v))
  }
  return resp
})
