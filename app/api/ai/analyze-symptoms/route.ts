import { NextResponse } from 'next/server'
import { validateRequestBody } from '@/lib/with-auth'
import { withMedicalAIAuth } from '@/lib/advanced-auth'
import { validateSymptomAnalysis } from '@/lib/validation-schemas'
import { medicalAI } from '@/lib/advanced-medical-ai'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

// POST - Análise de sintomas (apenas médicos e enfermeiros)
export const POST = withMedicalAIAuth(async (request, { user }) => {
  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: user.id,
      audience: TermAudience.PROFESSIONAL,
      gates: ['AI'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  const validation = await validateRequestBody(request, validateSymptomAnalysis)
  if (!validation.success) {
    return validation.response!
  }

  const data = validation.data!

  if (data?.patientId) {
    const patientUser = await prisma.user.findFirst({
      where: { patientId: data.patientId },
      select: { id: true },
    })
    if (patientUser?.id) {
      try {
        await assertUserAcceptedTerms({
          prisma,
          userId: patientUser.id,
          audience: TermAudience.PATIENT,
          gates: ['AI'],
        })
      } catch (e) {
        const res = termsEnforcementErrorResponse(e)
        if (res) return res
        throw e
      }
    }
  }

  // Análise dos sintomas com IA
  const analysis = await medicalAI.analyzeSymptoms(data)
  
  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'ai-symptoms',
    { 
      symptomsCount: data.symptoms.length,
      patientAge: data.patientAge,
      patientId: data.patientId,
      hasVitalSigns: !!data.vitalSigns,
      hasMedications: !!data.currentMedications?.length
    }
  )

  return NextResponse.json({
    success: true,
    data: analysis,
    metadata: {
      analyzedAt: new Date().toISOString(),
      analyzedBy: user.email,
      symptomsCount: data.symptoms.length,
      hasVitalSigns: !!data.vitalSigns,
      hasMedications: !!data.currentMedications?.length
    }
  })
})

// GET - Informações sobre a API
export const GET = withMedicalAIAuth(async (request, { user }) => {
  return NextResponse.json({
    message: 'API de análise de sintomas ativa',
    endpoint: '/api/ai/analyze-symptoms',
    method: 'POST',
    requiredFields: ['symptoms', 'patientAge', 'patientGender'],
    optionalFields: ['medicalHistory', 'currentMedications', 'vitalSigns', 'patientId'],
    user: {
      email: user.email,
      role: user.role
    }
  })
})
