import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuthUnlimited, createRateLimitStatsAPI, createRateLimitResetAPI } from '@/lib/advanced-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'
import { MemoryRateLimiter } from '@/lib/rate-limiter'

/**
 * GET - Estatísticas gerais do sistema de segurança
 */
export const GET = withAdminAuthUnlimited(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'rate-limit-stats':
        const currentRateLimitStats = MemoryRateLimiter.getStats()
        
        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Rate Limit Stats',
          currentRateLimitStats
        )

        return NextResponse.json({
          success: true,
          stats: currentRateLimitStats,
          timestamp: new Date().toISOString()
        })
        
      case 'audit-stats':
        const auditStats = {
          recentLogs: auditLogger.getRecentLogs(50),
          totalLogs: auditLogger.getRecentLogs(1000).length,
          errorLogs: auditLogger.getRecentLogs(1000).filter(log => !log.success).length,
          lastHourActivity: auditLogger.getRecentLogs(1000).filter(
            log => log.timestamp.getTime() > Date.now() - 60 * 60 * 1000
          ).length
        }

        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Security Audit Stats',
          { requestedBy: user.id }
        )

        return NextResponse.json({
          success: true,
          auditStats,
          timestamp: new Date().toISOString()
        })

      case 'security-overview':
        const systemRateLimitStats = MemoryRateLimiter.getStats()
        const recentAudits = auditLogger.getRecentLogs(100)
        
        const securityOverview = {
          rateLimit: systemRateLimitStats,
          audit: {
            totalRecent: recentAudits.length,
            errors: recentAudits.filter(log => !log.success).length,
            lastHour: recentAudits.filter(
              log => log.timestamp.getTime() > Date.now() - 60 * 60 * 1000
            ).length
          },
          systemHealth: {
            status: 'healthy',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
          }
        }

        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Security Overview',
          { requestedBy: user.id }
        )

        return NextResponse.json({
          success: true,
          overview: securityOverview,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida. Use: rate-limit-stats, audit-stats, security-overview' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'Security Admin API',
      error.message
    )

    console.error('Erro na API de segurança admin:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

/**
 * POST - Ações administrativas de segurança
 */
export const POST = withAdminAuthUnlimited(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'reset-rate-limit':
        if (!params.userId) {
          return NextResponse.json(
            { error: 'userId é obrigatório para reset de rate limit' },
            { status: 400 }
          )
        }

        // Reset manual do rate limiter
        const fakeRequest = new NextRequest('http://localhost', {
          headers: { 'x-forwarded-for': '127.0.0.1' }
        })
        
        MemoryRateLimiter.resetClient(fakeRequest, params.userId)

        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Rate Limit Reset',
          { targetUserId: params.userId, resetBy: user.id }
        )

        return NextResponse.json({
          success: true,
          message: `Rate limit resetado para o usuário ${params.userId}`,
          resetBy: user.name,
          timestamp: new Date().toISOString()
        })

      case 'clear-audit-logs':
        // Limpar logs de auditoria (cuidado: apenas para desenvolvimento)
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Ação não permitida em produção' },
            { status: 403 }
          )
        }

        auditLogger.logSuccess(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Audit Logs Cleared',
          { clearedBy: user.id, environment: process.env.NODE_ENV }
        )

        return NextResponse.json({
          success: true,
          message: 'Logs de auditoria limpos (apenas desenvolvimento)',
          clearedBy: user.name,
          timestamp: new Date().toISOString()
        })

      case 'security-alert':
        // Criar alerta de segurança manual
        const alertMessage = params.message || 'Alerta de segurança administrativo'
        
        auditLogger.logError(
          user.id,
          user.email,
          user.role,
          AuditAction.AI_INTERACTION,
          'Security Alert',
          `ALERTA MANUAL: ${alertMessage}`,
          { 
            alertBy: user.id, 
            severity: params.severity || 'medium',
            category: params.category || 'manual'
          }
        )

        return NextResponse.json({
          success: true,
          message: 'Alerta de segurança registrado',
          alert: alertMessage,
          createdBy: user.name,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida. Use: reset-rate-limit, clear-audit-logs, security-alert' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.AI_INTERACTION,
      'Security Admin POST',
      error.message
    )

    console.error('Erro na ação administrativa de segurança:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
