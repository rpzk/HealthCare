export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { withDoctorAuth, validateRequestBody } from '@/lib/with-auth'
import { MedicalAgentService } from '@/lib/medical-agent'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Schema de validação para agente médico
const medicalAgentSchema = z.object({
  patientId: z.string().cuid('ID do paciente inválido'),
  action: z.enum(['analyze_history', 'generate_evolution', 'analyze_trends', 'gather_data'], {
    errorMap: () => ({ message: 'Ação deve ser analyze_history, generate_evolution, analyze_trends ou gather_data' })
  }),
  currentSymptoms: z.string().optional(),
  currentFindings: z.string().optional(),
  context: z.string().optional()
})

function validateMedicalAgent(data: any) {
  const result = medicalAgentSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// POST - Ações do agente médico (apenas médicos)
export const POST = withDoctorAuth(async (request, { user }) => {
  const validation = await validateRequestBody(request, validateMedicalAgent)
  if (!validation.success) {
    return validation.response!
  }

  const { patientId, action, currentSymptoms, currentFindings, context } = validation.data!

  let result
  let actionDescription = ''

  switch (action) {
    case 'analyze_history':
      actionDescription = 'Análise do histórico completo do paciente'
      result = await MedicalAgentService.analyzePatientHistory(patientId)
      break

    case 'generate_evolution':
      actionDescription = 'Geração de evolução médica'
      result = await MedicalAgentService.generateEvolutionSuggestion(
        patientId,
        currentSymptoms,
        currentFindings,
        context
      )
      break

    case 'analyze_trends':
      actionDescription = 'Análise de tendências dos sinais vitais'
      result = await MedicalAgentService.analyzeTrends(patientId)
      break

    case 'gather_data':
      actionDescription = 'Coleta de dados completos do paciente'
      result = await MedicalAgentService.gatherPatientData(patientId)
      break
  }

  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'medical-agent',
    {
      patientId,
      action,
      actionDescription,
      hasSymptomsData: !!currentSymptoms,
      hasFindings: !!currentFindings,
      hasContext: !!context
    }
  )

  return NextResponse.json({
    success: true,
    data: result,
    metadata: {
      action,
      actionDescription,
      patientId,
      processedBy: user.email,
      timestamp: new Date().toISOString(),
      message: `${actionDescription} concluída com sucesso`
    }
  })
})
