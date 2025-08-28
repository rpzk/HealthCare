export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { AIAnalyticsService } from '@/lib/ai-analytics'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { z } from 'zod'

// GET - Tendências de diagnóstico da IA (apenas médicos)
export const GET = withDoctorAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') as 'week' | 'month' | 'quarter' || 'month'

  // Validar período
  const validPeriods = ['week', 'month', 'quarter']
  if (!validPeriods.includes(period)) {
    return NextResponse.json({
      error: 'Período inválido. Use: week, month ou quarter'
    }, { status: 400 })
  }

  const trends = await AIAnalyticsService.getDiagnosisTrends(period)
  
  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.AI_ANALYSIS,
    'diagnosis-trends',
    {
      period,
      trendsCount: Array.isArray(trends) ? trends.length : 0
    }
  )

  return NextResponse.json({
    success: true,
    data: trends,
    metadata: {
      period,
      retrievedAt: new Date().toISOString(),
      retrievedBy: user.email,
      trendsCount: Array.isArray(trends) ? trends.length : 0
    }
  })
})
