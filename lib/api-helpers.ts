/**
 * API Route Helpers
 * 
 * Helpers para usar em API routes do Next.js
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limiter'

export type RateLimitConfig = { windowMs: number; maxRequests: number; blockDuration: number; message?: string }
export const RateLimitPresets = {
  NORMAL: { windowMs: 60_000, maxRequests: 100, blockDuration: 60_000, message: 'Too many requests' },
} satisfies Record<string, RateLimitConfig>

/**
 * Wrapper para aplicar rate limiting em API routes
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>,
  config: RateLimitConfig = RateLimitPresets.NORMAL
) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    // Obter identificador (IP ou userId)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Use the existing in-memory limiter as a safe default.
    const limiter = rateLimiters.default
    const result = limiter(request)
    if (result instanceof NextResponse) {
      return result
    }
    
    // Executar handler original
    const response = await handler(request, context)
    Object.entries(result.headers).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }
}

/**
 * Wrapper para aplicar autenticação em API routes
 */
export function withAuth(
  handler: (request: NextRequest, context: { params?: Record<string, string> }, session: unknown) => Promise<NextResponse>,
  options: { requireRole?: string[] } = {}
) {
  return async (request: NextRequest, context: { params?: Record<string, string> } = {}) => {
    const session = await getServerSession(authOptions)
    
    if (!(session as any)?.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Não autorizado' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Verificar role se especificado
    if (options.requireRole && options.requireRole.length > 0) {
      const userRole = (session as any).user?.role
      if (!options.requireRole.includes(userRole)) {
        return new NextResponse(
          JSON.stringify({ error: 'Sem permissão' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return handler(request, context, session)
  }
}

/**
 * Combina rate limiting + autenticação
 */
export function withAuthAndRateLimit(
  handler: (request: NextRequest, context: { params?: Record<string, string> }, session: unknown) => Promise<NextResponse>,
  options: {
    requireRole?: string[];
    rateLimit?: RateLimitConfig;
  } = {}
) {
  return withRateLimit(
    withAuth(handler, { requireRole: options.requireRole }),
    options.rateLimit || RateLimitPresets.NORMAL
  )
}

/**
 * Helper para extrair IP do request
 */
export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

/**
 * Helper para parsear query params
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  const { searchParams } = new URL(request.url);
  return searchParams;
}

/**
 * Helper para criar resposta de erro padronizada
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: message,
      ...(details ? { details } : {}),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Helper para criar resposta de sucesso padronizada
 */
export function successResponse(data: any, status: number = 200): NextResponse {
  return new NextResponse(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Helper para validação de método HTTP
 */
export function validateMethod(
  request: NextRequest,
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return errorResponse(
      `Método ${request.method} não permitido`,
      405
    )
  }
  return null;
}

export const ApiHelpers = {
  withRateLimit,
  withAuth,
  withAuthAndRateLimit,
  getClientIp,
  getQueryParams,
  errorResponse,
  successResponse,
  validateMethod,
}
