/**
 * Sistema de Rate Limiting Avançado para HealthCare
 * Proteção contra ataques DDoS e uso excessivo de recursos
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number      // Janela de tempo em millisegundos
  maxRequests: number   // Máximo de requests por janela
  blockDuration: number // Duração do bloqueio em millisegundos
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blockedUntil?: number
}

/**
 * Configurações por tipo de endpoint
 */
export const RATE_LIMIT_CONFIGS = {
  // APIs críticas de IA médica - limite mais restritivo
  AI_MEDICAL: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 30,            // 30 requests/minuto
    blockDuration: 5 * 60 * 1000, // 5 minutos de bloqueio
  },
  
  // APIs de consulta - limite moderado
  CONSULTATIONS: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 100,           // 100 requests/minuto
    blockDuration: 2 * 60 * 1000, // 2 minutos de bloqueio
  },
  
  // APIs de pacientes - limite padrão
  PATIENTS: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 200,           // 200 requests/minuto
    blockDuration: 1 * 60 * 1000, // 1 minuto de bloqueio
  },
  
  // APIs de dashboard/stats - limite alto
  DASHBOARD: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 500,           // 500 requests/minuto
    blockDuration: 30 * 1000,   // 30 segundos de bloqueio
  },
  
  // Limite global padrão
  DEFAULT: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 100,           // 100 requests/minuto
    blockDuration: 1 * 60 * 1000, // 1 minuto de bloqueio
  }
} as const

/**
 * Rate Limiter usando memória local (para desenvolvimento)
 * Em produção, deve usar Redis para escalar entre instâncias
 */
export class MemoryRateLimiter {
  private static store = new Map<string, RateLimitEntry>()
  
  /**
   * Limpa entradas expiradas periodicamente
   */
  private static cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.store.forEach((entry, key) => {
      if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.store.delete(key))
  }
  
  /**
   * Gera chave única para identificar cliente
   */
  private static getKey(request: NextRequest, userId?: string): string {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Se tiver userId autenticado, usar como identificador principal
    if (userId) {
      return `user:${userId}:${ip.split(',')[0]}`
    }
    
    // Senão, usar IP + User-Agent como fallback
    return `ip:${ip.split(',')[0]}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`
  }
  
  /**
   * Verifica se o request deve ser limitado
   */
  static checkLimit(
    request: NextRequest, 
    config: RateLimitConfig,
    userId?: string
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    // Cleanup periódico
    if (Math.random() < 0.01) { // 1% de chance a cada call
      this.cleanup()
    }
    
    const key = this.getKey(request, userId)
    const now = Date.now()
    const entry = this.store.get(key)
    
    // Verificar se está bloqueado
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      }
    }
    
    // Se não existe ou expirou, criar nova entrada
    if (!entry || entry.resetTime <= now) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }
    
    // Incrementar contador
    entry.count++
    
    // Verificar se excedeu limite
    if (entry.count > config.maxRequests) {
      // Bloquear por período definido
      entry.blockedUntil = now + config.blockDuration
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil(config.blockDuration / 1000)
      }
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }
  
  /**
   * Força reset do contador para um cliente específico
   * Útil para casos administrativos
   */
  static resetClient(request: NextRequest, userId?: string): void {
    const key = this.getKey(request, userId)
    this.store.delete(key)
  }
  
  /**
   * Obter estatísticas do rate limiter
   */
  static getStats(): {
    totalClients: number
    blockedClients: number
    totalRequests: number
  } {
    const now = Date.now()
    let totalClients = 0
    let blockedClients = 0
    let totalRequests = 0
    
    this.store.forEach((entry) => {
      totalClients++
      totalRequests += entry.count
      
      if (entry.blockedUntil && entry.blockedUntil > now) {
        blockedClients++
      }
    })
    
    return {
      totalClients,
      blockedClients,
      totalRequests
    }
  }
}

/**
 * Middleware de Rate Limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (request: NextRequest, userId?: string) => {
    const result = MemoryRateLimiter.checkLimit(request, config, userId)
    
    if (!result.allowed) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Muitas solicitações. Tente novamente mais tarde.',
          retryAfter: result.retryAfter
        },
        { status: 429 }
      )
      
      // Headers informativos
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
      
      if (result.retryAfter) {
        response.headers.set('Retry-After', result.retryAfter.toString())
      }
      
      return response
    }
    
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
      }
    }
  }
}

/**
 * Rate limiters pré-configurados por tipo de endpoint
 */
export const rateLimiters = {
  aiMedical: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.AI_MEDICAL),
  consultations: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.CONSULTATIONS),
  patients: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.PATIENTS),
  dashboard: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.DASHBOARD),
  default: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.DEFAULT)
}

/**
 * Helper para determinar qual rate limiter usar baseado na URL
 */
export function getRateLimiterForPath(pathname: string) {
  if (pathname.includes('/api/ai/')) {
    return rateLimiters.aiMedical
  }
  
  if (pathname.includes('/api/consultations')) {
    return rateLimiters.consultations
  }
  
  if (pathname.includes('/api/patients')) {
    return rateLimiters.patients
  }
  
  if (pathname.includes('/api/dashboard')) {
    return rateLimiters.dashboard
  }
  
  return rateLimiters.default
}
