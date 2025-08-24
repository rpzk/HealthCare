import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withDoctorAuth, validateRequestBody } from '@/lib/with-auth'
import { AIAnalyticsService } from '@/lib/ai-analytics'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// Schema para log de uso de IA
const aiUsageSchema = z.object({
  type: z.enum(['symptom_analysis', 'drug_interaction', 'medical_summary'], {
    errorMap: () => ({ message: 'Tipo deve ser symptom_analysis, drug_interaction ou medical_summary' })
  }),
  patientId: z.string().optional(),
  responseTime: z.number().optional(),
  metadata: z.record(z.any()).optional()
})

function validateAiUsage(data: any) {
  const result = aiUsageSchema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

// GET - Analytics de IA (apenas médicos para dados detalhados)
export const GET = withDoctorAuth(async (request, { user }) => {
  // Buscar parâmetros da query
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const doctorId = searchParams.get('doctorId')

  let analytics

  // Se for solicitação específica de um médico
  if (doctorId) {
    const doctorStats = await AIAnalyticsService.getDoctorAIStats(doctorId)
    
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_ANALYSIS,
      'doctor-analytics',
      { targetDoctorId: doctorId }
    )
    
    return NextResponse.json({
      success: true,
      data: doctorStats,
      metadata: {
        retrievedAt: new Date().toISOString(),
        retrievedBy: user.email,
        doctorId
      }
    })
  }

  // Buscar analytics gerais
  analytics = await AIAnalyticsService.getAIAnalytics(
    dateFrom ? new Date(dateFrom) : undefined,
    dateTo ? new Date(dateTo) : undefined
  )

  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'general-analytics',
    {
      dateFrom,
      dateTo,
      dataPoints: analytics ? Object.keys(analytics).length : 0
    }
  )

  return NextResponse.json({
    success: true,
    data: analytics,
    metadata: {
      retrievedAt: new Date().toISOString(),
      retrievedBy: user.email,
      dateFrom,
      dateTo
    }
  })
})

// POST - Registrar uso da IA (usuários autenticados)
export const POST = withAuth(async (request, { user }) => {
  const validation = await validateRequestBody(request, validateAiUsage)
  if (!validation.success) {
    return validation.response!
  }

  const { type, patientId, responseTime, metadata } = validation.data!

  const result = await AIAnalyticsService.logAIUsage(
    type,
    patientId,
    user.id,
    responseTime,
    metadata
  )

  if (result) {
    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'usage-log',
      {
        type,
        patientId,
        responseTime,
        hasMetadata: !!metadata
      }
    )
    
    return NextResponse.json({
      success: true,
      message: 'Uso registrado com sucesso'
    })
  } else {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'usage-log',
      'Falha ao registrar uso da IA'
    )
    
    return NextResponse.json(
      { error: 'Falha ao registrar uso' },
      { status: 500 }
    )
  }
})
