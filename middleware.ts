import { withAuth } from "next-auth/middleware"
import { NextResponse } from 'next/server'
// Use edge-safe logger to avoid Node.js 'crypto' in Edge runtime
import { createRequestId, logger } from '@/lib/edge-logger'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth?.token

  const requestId = createRequestId()
  const start = Date.now()

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
  res.headers.set('X-Request-ID', requestId)

    // Segurança: cabeçalhos padrão
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('X-XSS-Protection', '0')
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    // HSTS apenas em produção e fora de localhost
    const isProd = process.env.NODE_ENV === 'production'
    const host = req.headers.get('host') || ''
    if (isProd && !host.includes('localhost')) {
      res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains; preload')
    }

    // CSP com relaxamento em desenvolvimento para suportar React Refresh (precisa de eval)
    const dev = !isProd
    const scriptSrc = dev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'"
    const connectSrc = dev
      ? "connect-src 'self' ws: http://localhost:3000 http://localhost:3001 https://generativelanguage.googleapis.com"
      : "connect-src 'self' https://generativelanguage.googleapis.com"

    res.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      scriptSrc, // em prod não inclui 'unsafe-eval'
      // Allow Google Fonts stylesheet (used by app/globals.css)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Explicit element-level style source (fallback used previously)
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      connectSrc,
      // Allow font files from Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join('; '))

    // Proteções adicionais de navegação
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
    res.headers.set('X-DNS-Prefetch-Control', 'off')

    // Log estruturado ao final
    const duration = Date.now() - start
    logger.info({
      msg: 'request',
      id: requestId,
      path: pathname,
      method: req.method,
      email: token?.email || 'anon',
      role: token?.role || 'unknown',
      durationMs: duration
    })
    return res
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Dev/Test bypass for API routes: allow requests with x-test-user header when enabled
        try {
          // Edge runtime safe: process.env is available in middleware
          const bypassEnabled = (process.env.ALLOW_TEST_BYPASS || '').toString() === 'true'
          const hasBypassHeader = !!req.headers.get('x-test-user')
          if (bypassEnabled && hasBypassHeader && pathname.startsWith('/api/')) {
            return true
          }
        } catch (_) {
          // noop - fallback to default behavior
        }

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
  '/((?!api/health|api/auth|_next/static|_next/image|favicon.ico|auth/).*)',
  ],
}
