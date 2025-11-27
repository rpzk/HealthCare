/**
 * Middleware Avançado com AI Anomaly Detection e Redis Integration
 * Combina autenticação + rate limiting + auditoria + detecção de anomalias
 */

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './auth-middleware'
import { auditLogger, AuditAction } from './audit-logger'
import { getRateLimiterForPath } from './rate-limiter'
import { createRedisRateLimiter } from './redis-integration'
import { aiAnomalyDetector } from './ai-anomaly-detector'

export interface AdvancedAuthenticatedApiHandler {
  (request: NextRequest, context: { 
    params: Record<string, string | string[]>,
    user: {
      id: string
      email: string
      name: string
      role: string
      speciality?: string
      crmNumber?: string
    }
  }): Promise<NextResponse>
}

/**
 * 🔧 Configurações de rate limit por tipo de endpoint
 */
function getRateLimitConfig(endpointType: string) {
  const configs = {
    'aiMedical': { limit: 30, windowMs: 60000, blockDurationMs: 300000 }, // 30/min, block 5min
    'consultations': { limit: 100, windowMs: 60000, blockDurationMs: 120000 }, // 100/min, block 2min
    'patients': { limit: 200, windowMs: 60000, blockDurationMs: 60000 }, // 200/min, block 1min
    'dashboard': { limit: 500, windowMs: 60000, blockDurationMs: 30000 }, // 500/min, block 30s
    'default': { limit: 100, windowMs: 60000, blockDurationMs: 60000 }
  };

  return configs[endpointType as keyof typeof configs] || configs.default;
}

/**
 * 🎯 Identifica tipo de endpoint baseado na URL
 */
function getEndpointType(pathname: string): string {
  if (pathname.includes('/ai/') || pathname.includes('/analyze')) return 'aiMedical';
  if (pathname.includes('/consultations')) return 'consultations';
  if (pathname.includes('/patients')) return 'patients';
  if (pathname.includes('/dashboard') || pathname.includes('/stats')) return 'dashboard';
  return 'default';
}

/**
 * Higher-Order Function com AI Anomaly Detection + Redis Rate Limiting + Auth
 */
export function withRateLimitedAuth(
  handler: AdvancedAuthenticatedApiHandler,
  options: {
    requiredRoles?: string[]
    customRateLimit?: 'aiMedical' | 'consultations' | 'patients' | 'dashboard' | 'default'
    skipRateLimit?: boolean
  } = {}
) {
  return async (request: NextRequest, context: { params: Record<string, string | string[]> }) => {
    const startTime = Date.now()
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    let userId = 'anonymous'
    let statusCode = 200

    try {
      // 1. Autenticação
      const authResult = await authMiddleware(request)
      
      if ('status' in authResult) {
        const authError = authResult as { status?: number; response?: NextResponse }
        statusCode = authError.status || 401
        
        // 📊 Log evento de segurança para AI
        await aiAnomalyDetector.analyzeSecurityEvent({
          userId,
          ip,
          endpoint: request.nextUrl.pathname,
          timestamp: Date.now(),
          userAgent,
          responseTime: Date.now() - startTime,
          statusCode
        })
        
        return authError.response || NextResponse.json({ error: 'Authentication failed' }, { status: statusCode })
      }

      const { user } = authResult as { user: { id: string; email: string; name: string; role: string } }
      userId = user.id

      // 2. 🧠 AI-Powered Rate Limiting com Redis
      if (!options.skipRateLimit) {
        const { limit, windowMs, blockDurationMs } = getRateLimitConfig(
          options.customRateLimit || getEndpointType(request.nextUrl.pathname)
        )

        // Usar Redis Rate Limiter para distribuição horizontal
  const rateLimitResult = await createRedisRateLimiter().checkRateLimit(
          userId, 
          limit, 
          windowMs, 
          blockDurationMs
        )

        if (!rateLimitResult.allowed) {
          statusCode = 429

          // 📊 Log evento para análise de anomalias
          const anomalies = await aiAnomalyDetector.analyzeSecurityEvent({
            userId,
            ip,
            endpoint: request.nextUrl.pathname,
            timestamp: Date.now(),
            userAgent,
            responseTime: Date.now() - startTime,
            statusCode
          })

          // 🚨 Log anomalias críticas
          const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL')
          if (criticalAnomalies.length > 0) {
            auditLogger.logError(
              userId,
              user.email || 'unknown',
              user.role || 'unknown',
              AuditAction.CRITICAL_ANOMALY_DETECTED,
              request.nextUrl.pathname,
              'Critical security anomaly detected',
              {
                anomalies: criticalAnomalies,
                endpoint: request.nextUrl.pathname,
                ip
              }
            )
          }

          // Auditar rate limit
          auditLogger.logError(
            userId,
            user.email || 'unknown',
            user.role || 'unknown',
            AuditAction.RATE_LIMIT_EXCEEDED,
            request.nextUrl.pathname,
            'Rate limit exceeded',
            {
              limit,
              isBlocked: rateLimitResult.isBlocked,
              anomalies: anomalies.length,
              ip
            }
          )

          const response = NextResponse.json(
            { 
              error: 'Rate limit exceeded',
              anomalies: anomalies.filter(a => a.severity !== 'LOW') // Não expor anomalias baixas
            },
            { status: 429 }
          )

          // Headers de rate limit
          response.headers.set('X-RateLimit-Limit', limit.toString())
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
          
          if (rateLimitResult.retryAfter) {
            response.headers.set('Retry-After', rateLimitResult.retryAfter.toString())
          }

          return response
        }

        // Adicionar headers de rate limit nas respostas válidas
        const response = await handler(request, { ...context, user })
        
        if (response) {
          response.headers.set('X-RateLimit-Limit', limit.toString())
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

          // 📊 Analisar evento normal para aprendizado
          const anomalies = await aiAnomalyDetector.analyzeSecurityEvent({
            userId,
            ip,
            endpoint: request.nextUrl.pathname,
            timestamp: Date.now(),
            userAgent,
            responseTime: Date.now() - startTime,
            statusCode: response.status
          })

          // Log apenas anomalias de média/alta severidade
          if (anomalies.some(a => ['MEDIUM', 'HIGH', 'CRITICAL'].includes(a.severity))) {
            auditLogger.logError(
              userId,
              user.email || 'unknown',
              user.role || 'unknown',
              AuditAction.ANOMALY_DETECTED,
              request.nextUrl.pathname,
              'Anomaly detected in user behavior',
              {
                anomalies: anomalies.filter(a => a.severity !== 'LOW'),
                ip
              }
            )
          }
        }

        return response
      }

      // 3. Execução sem rate limiting
      const response = await handler(request, { ...context, user })
      
      // 📊 Analisar mesmo sem rate limiting
      if (response) {
        await aiAnomalyDetector.analyzeSecurityEvent({
          userId,
          ip,
          endpoint: request.nextUrl.pathname,
          timestamp: Date.now(),
          userAgent,
          responseTime: Date.now() - startTime,
          statusCode: response.status
        })
      }

      return response
      
    } catch (error) {
      statusCode = 500
      
      // Log erro e análise de segurança
      await Promise.all([
        auditLogger.logError(
          userId,
          'unknown',
          'unknown',
          AuditAction.API_ERROR,
          request.nextUrl.pathname,
          error instanceof Error ? error.message : 'Unknown error',
          { ip }
        ),
        aiAnomalyDetector.analyzeSecurityEvent({
          userId,
          ip,
          endpoint: request.nextUrl.pathname,
          timestamp: Date.now(),
          userAgent,
          responseTime: Date.now() - startTime,
          statusCode
        })
      ])

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * 🧠 Middleware especializado para IA Médica com detecção de anomalias
 */
export function withMedicalAIAuth(handler: AdvancedAuthenticatedApiHandler) {
  return withRateLimitedAuth(handler, {
    customRateLimit: 'aiMedical',
    requiredRoles: ['DOCTOR', 'NURSE', 'ADMIN']
  })
}

/**
 * 🏥 Middleware para sistema de consultas
 */
export function withConsultationAuth(handler: AdvancedAuthenticatedApiHandler) {
  return withRateLimitedAuth(handler, {
    customRateLimit: 'consultations',
    requiredRoles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN']
  })
}

/**
 * 👥 Middleware para gestão de pacientes  
 */
export function withPatientAuth(handler: AdvancedAuthenticatedApiHandler) {
  return withRateLimitedAuth(handler, {
    customRateLimit: 'patients',
    requiredRoles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN']
  })
}

/**
 * 📊 Middleware para analytics e dashboard
 */
export function withDashboardAuth(handler: AdvancedAuthenticatedApiHandler) {
  return withRateLimitedAuth(handler, {
    customRateLimit: 'dashboard',
    requiredRoles: ['DOCTOR', 'NURSE', 'ADMIN', 'MANAGER']
  })
}

/**
 * 🔧 Middleware administrativo sem limite de rate
 */
export function withAdminAuthUnlimited(handler: AdvancedAuthenticatedApiHandler) {
  return withRateLimitedAuth(handler, {
    skipRateLimit: true,
    requiredRoles: ['ADMIN']
  })
}

/**
 * 📊 Cria resposta com estatísticas de rate limiting
 */
export function createRateLimitStatsAPI() {
  return async (request: NextRequest) => {
    try {
  const stats = await createRedisRateLimiter().getStats()
      const detectorStats = aiAnomalyDetector.getDetectorStats()

      return NextResponse.json({
        rateLimitStats: stats,
        anomalyDetectorStats: detectorStats,
        timestamp: Date.now()
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get rate limit stats' },
        { status: 500 }
      )
    }
  }
}

/**
 * 🔄 Cria API para reset de rate limiting
 */
export function createRateLimitResetAPI() {
  return async (request: NextRequest) => {
    try {
      const { userId } = await request.json()
      
      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required' },
          { status: 400 }
        )
      }

  await createRedisRateLimiter().resetRateLimit(userId)

      return NextResponse.json({
        success: true,
        message: `Rate limit reset for user ${userId}`,
        timestamp: Date.now()
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to reset rate limit' },
        { status: 500 }
      )
    }
  }
}
