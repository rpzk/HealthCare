import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth, validateRequestBody } from '@/lib/with-auth'
import { validateSymptomAnalysis } from '@/lib/validation-schemas'
import { medicalAI } from '@/lib/advanced-medical-ai'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// POST - Análise de sintomas (apenas médicos e enfermeiros)
export const POST = withDoctorAuth(async (request, { user }) => {
  const validation = await validateRequestBody(request, validateSymptomAnalysis)
  if (!validation.success) {
    return validation.response!
  }

  const data = validation.data!

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
export const GET = withDoctorAuth(async (request, { user }) => {
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
