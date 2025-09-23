import { NextResponse } from 'next/server'
import { withDoctorAuth, validateRequestBody } from '@/lib/with-auth'
import { medicalAI } from '@/lib/advanced-medical-ai'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Schema de validação para verificação de interações
const drugInteractionSchema = z.object({
  medications: z.array(z.string().min(1, 'Nome do medicamento é obrigatório')).min(1, 'Pelo menos um medicamento é obrigatório'),
  patientId: z.string().optional()
})

function validateDrugInteraction(data: any) {
  const result = drugInteractionSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// POST - Verificação de interações medicamentosas (apenas médicos)
export const POST = withDoctorAuth(async (request, { user }) => {
  const validation = await validateRequestBody(request, validateDrugInteraction)
  if (!validation.success) {
    return validation.response!
  }

  const { medications, patientId } = validation.data!

  if (medications.length < 2) {
    return NextResponse.json({
      success: true,
      data: {
        medications,
        interactions: [],
        contraindications: [],
        message: 'Pelo menos 2 medicamentos são necessários para verificar interações'
      }
    })
  }

  // Verificação de interações com IA
  const interactionCheck = await medicalAI.checkDrugInteractions(medications)
  
  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_INTERACTION,
    'drug-interactions',
    {
      patientId,
      medicationsCount: medications.length,
      interactionsFound: interactionCheck.interactions.length,
      hasSevereInteractions: interactionCheck.interactions.some(i => i.severity === 'severe'),
      medications: medications.slice(0, 5) // Primeiros 5 para o log
    }
  )

  return NextResponse.json({
    success: true,
    data: interactionCheck,
    metadata: {
      checkedAt: new Date().toISOString(),
      checkedBy: user.email,
      medicationsCount: medications.length,
      interactionsFound: interactionCheck.interactions.length,
      hasSevereInteractions: interactionCheck.interactions.some(i => i.severity === 'severe')
    }
  })
})

// GET - Informações sobre a API
export const GET = withDoctorAuth(async (request, { user }) => {
  return NextResponse.json({
    message: 'API de verificação de interações medicamentosas ativa',
    endpoint: '/api/ai/drug-interactions',
    method: 'POST',
    requiredFields: ['medications'],
    optionalFields: ['patientId'],
    example: {
      medications: ['Aspirina', 'Warfarina', 'Omeprazol']
    },
    user: {
      email: user.email,
      role: user.role
    }
  })
})
