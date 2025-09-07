import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './auth-middleware'

export interface AuthenticatedApiHandler {
  (request: NextRequest, context: { 
    params: any,
    user: {
      id: string
      email: string
      name: string
      role: string
      speciality?: string
      crmNumber?: string
    }
  }): Promise<NextResponse> | NextResponse | Promise<NextResponse | undefined>
}

/**
 * Higher-Order Function para proteger rotas API com autenticação
 * 
 * @param handler - Função handler da rota API
 * @param options - Opções de autenticação (roles necessárias)
 * @returns Função handler protegida
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, { user }) => {
 *   // user já está autenticado e validado
 *   return NextResponse.json({ message: `Olá ${user.name}` })
 * })
 * 
 * export const POST = withAuth(async (request, { user, params }) => {
 *   // Apenas médicos podem acessar
 *   const data = await request.json()
 *   // ... lógica da API
 * }, { requireRole: ['DOCTOR', 'ADMIN'] })
 * ```
 */
export function withAuth(
  handler: AuthenticatedApiHandler,
  options: { requireRole?: string[] } = {}
) {
  return async (request: NextRequest, context: { params?: any } = {}) => {
    try {
      // Executar middleware de autenticação
      const authResult = await authMiddleware(request, options)

      // Se falhou na autenticação, retornar erro
      if (!authResult.success) {
        return authResult.response!
      }

      // Chamar handler original com usuário autenticado
      return await handler(request, {
        params: context.params || {},
        user: authResult.user!
      })

    } catch (error) {
      console.error('Erro no wrapper withAuth:', error)
      return NextResponse.json(
        { 
          error: 'Erro interno do servidor',
          timestamp: new Date().toISOString(),
          success: false
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Variante que aplica RBAC baseado em uma "action" declarativa usando RBAC_MATRIX
 * Evita replicar listas de roles em cada rota e centraliza política.
 */
import { isAllowed } from './rbac'
export function withRbac(
  action: string,
  handler: AuthenticatedApiHandler
) {
  return withAuth(async (request, ctx) => {
    if (!isAllowed(action, ctx.user.role)) {
      return NextResponse.json({ error: 'Acesso negado - RBAC' }, { status: 403 })
    }
    return handler(request, ctx)
  })
}

/**
 * Variação do withAuth apenas para médicos
 */
export function withDoctorAuth(handler: AuthenticatedApiHandler) {
  return withAuth(handler, { requireRole: ['DOCTOR', 'ADMIN'] })
}

/**
 * Variação do withAuth apenas para administradores
 */
export function withAdminAuth(handler: AuthenticatedApiHandler) {
  return withAuth(handler, { requireRole: ['ADMIN'] })
}

/**
 * Helper para validar dados de entrada da API
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: any) => { success: boolean; data?: T; errors?: string[] }
): Promise<{ success: boolean; data?: T; errors?: string[]; response?: NextResponse }> {
  try {
    const body = await request.json()
    const validation = validator(body)
    
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
        response: NextResponse.json(
          { 
            error: 'Dados inválidos',
            details: validation.errors,
            success: false
          },
          { status: 400 }
        )
      }
    }

    return {
      success: true,
      data: validation.data
    }

  } catch (error) {
    return {
      success: false,
      errors: ['Formato JSON inválido'],
      response: NextResponse.json(
        { error: 'Formato JSON inválido' },
        { status: 400 }
      )
    }
  }
}
