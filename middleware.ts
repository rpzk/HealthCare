import { withAuth } from "next-auth/middleware"
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth?.token

    // Log de auditoria para rotas API
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      console.log(`🔐 API Access: ${token?.email || 'unknown'} -> ${req.method} ${pathname}`)
    }

    // Verificar role para rotas administrativas
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.rewrite(new URL('/auth/error?error=AccessDenied', req.url))
    }

    // Rate limiting simples (pode ser melhorado com Redis)
    const userAgent = req.headers.get('user-agent') || ''
    if (userAgent.includes('bot') && !pathname.startsWith('/api/auth/')) {
      return NextResponse.json({ error: 'Bots não permitidos' }, { status: 403 })
    }

    const res = NextResponse.next()

    // Segurança: cabeçalhos padrão
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('X-XSS-Protection', '0')
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
    // CSP mínima segura (ajuste conforme assets/domínios usados)
    res.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; '))

    return res
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Permitir acesso às rotas públicas
        if (pathname.startsWith('/auth/')) {
          return true
        }

        // Permitir acesso às rotas da API de autenticação
        if (pathname.startsWith('/api/auth/')) {
          return true
        }

        // Permitir acesso a assets estáticos
        if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
          return true
        }

        // Exigir autenticação para todas as outras rotas
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/ (authentication pages)
     * - public files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/).*)',
  ],
}
