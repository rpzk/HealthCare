export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { AIAnalyticsService } from '@/lib/ai-analytics'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Buscar recomendações do sistema IA (apenas médicos)
export const GET = withDoctorAuth(async (request, { user }) => {
  const recommendations = await AIAnalyticsService.getSystemRecommendations()
  
  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'recommendations',
    {
      recommendationsCount: recommendations.length || 0
    }
  )

  return NextResponse.json({
    success: true,
    data: recommendations,
    metadata: {
      retrievedAt: new Date().toISOString(),
      retrievedBy: user.email,
      count: recommendations.length || 0
    }
  })
})
