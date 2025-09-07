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

    // HSTS apenas em produção e fora de localhost
    const isProd = process.env.NODE_ENV === 'production'
    const host = req.headers.get('host') || ''
    if (isProd && !host.includes('localhost')) {
      res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains; preload')
    }

    // CSP mais rígida (ajuste se necessário para assets externos)
    res.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'", // evite 'unsafe-inline' quando possível usando nonce
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join('; '))

    // Proteções adicionais de navegação
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Resource-Policy', 'same-site')
    res.headers.set('X-DNS-Prefetch-Control', 'off')

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
  '/((?!api/health|api/auth|_next/static|_next/image|favicon.ico|auth/).*)',
  ],
}
