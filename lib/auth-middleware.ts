import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    name: string
    role: string
    speciality?: string
    crmNumber?: string
  }
}

/**
 * Middleware para verificar autenticação em rotas API
 * Extrai e valida o token JWT do NextAuth
 */
export async function authMiddleware(
  request: NextRequest,
  options: { requireRole?: string[] } = {}
): Promise<{ success: boolean; user?: any; error?: string; response?: NextResponse }> {
  try {
    // DEV/TEST bypass: allow injecting a fake user via header when enabled explicitly
    if (process.env.ALLOW_TEST_BYPASS === 'true') {
      const testUser = request.headers.get('x-test-user')
      if (testUser) {
        const role = request.headers.get('x-test-role') || 'ADMIN'
        const uid = request.headers.get('x-test-user-id') || '1'
        const user = {
          id: uid,
          email: `${testUser}@local.test`,
          name: testUser,
          role
        }
        if (options.requireRole && options.requireRole.length > 0 && !options.requireRole.includes(role)) {
          return {
            success: false,
            error: 'Acesso negado - Permissões insuficientes (bypass) ',
            response: NextResponse.json({ error: 'Acesso negado - RBAC (bypass)' }, { status: 403 })
          }
        }
        return { success: true, user }
      }
    }

    // Obter token do NextAuth
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return {
        success: false,
        error: 'Token de autenticação não encontrado',
        response: NextResponse.json(
          { error: 'Não autorizado - Token não encontrado' },
          { status: 401 }
        )
      }
    }

    // Verificar se o usuário está ativo (se necessário, consultar BD)
    if (!token.id || !token.email) {
      return {
        success: false,
        error: 'Token inválido - dados do usuário ausentes',
        response: NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        )
      }
    }

    // Verificar role se especificado
    if (options.requireRole && options.requireRole.length > 0) {
      if (!token.role || !options.requireRole.includes(token.role as string)) {
        return {
          success: false,
          error: `Acesso negado - Role necessária: ${options.requireRole.join(' ou ')}`,
          response: NextResponse.json(
            { error: 'Acesso negado - Permissões insuficientes' },
            { status: 403 }
          )
        }
      }
    }

    // Estruturar dados do usuário
    const user = {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      role: token.role as string,
      speciality: token.speciality as string | undefined,
      crmNumber: token.crmNumber as string | undefined
    }

    // Log de auditoria (opcional em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Acesso autorizado: ${user.email} (${user.role}) - ${request.method} ${request.url}`)
    }

    return {
      success: true,
      user
    }

  } catch (error) {
    console.error('Erro no middleware de autenticação:', error)
    return {
      success: false,
      error: 'Erro interno de autenticação',
      response: NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }
}

/**
 * Helper para verificar permissões específicas
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Helper para criar resposta de erro padrão
 */
export function createAuthError(message: string, status: number = 401): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
      success: false
    },
    { status }
  )
}
