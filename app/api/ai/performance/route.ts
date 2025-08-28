export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { AIAnalyticsService } from '@/lib/ai-analytics'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Métricas de performance da IA (apenas administradores)
export const GET = withAdminAuth(async (request, { user }) => {
  const metrics = await AIAnalyticsService.getPerformanceMetrics()
  
  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.SYSTEM_CONFIG_CHANGE,
    'ai-performance-metrics',
    {
      metricsRetrieved: Object.keys(metrics).length
    }
  )

  return NextResponse.json({
    success: true,
    data: metrics,
    metadata: {
      retrievedAt: new Date().toISOString(),
      retrievedBy: user.email,
      access: 'admin-only'
    }
  })
})
