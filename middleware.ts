import { NextResponse, NextRequest } from 'next/server'
import { checkRateLimit, RateLimitPresets } from './lib/rate-limiter-factory'

function getClientKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  return `ip:${ip}`
}

// Generate nonce for CSP
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export async function middleware(request: NextRequest) {
  // Skip rate limiting for static assets
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.svg')) {
    return NextResponse.next()
  }

  // IMPORTANT: do not rate-limit page navigations (e.g. /auth/signin)
  // because a 429 JSON response will break rendering and can lock users out.
  // Apply rate limiting only to API routes, excluding NextAuth and health.
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthApiRoute = pathname.startsWith('/api/auth/')
  const isHealthRoute = pathname === '/api/health'
  const isTeleApiRoute = pathname.startsWith('/api/tele/')
  
  const res = NextResponse.next()

  // Apply rate limiting using RateLimiterFactory only for API routes
  // (excluding /api/auth/* and /api/health).
  if (isApiRoute && !isAuthApiRoute && !isHealthRoute && !isTeleApiRoute) {
    // Auto-selects Redis (production) or in-memory (development)
    const clientKey = getClientKey(request)
    const rateLimitResult = await checkRateLimit(clientKey, {
      ...RateLimitPresets.standard,
      keyPrefix: 'middleware'
    })

    const { allowed, remaining } = rateLimitResult

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          } 
        }
      )
    }

    // Rate limit headers (API only)
    res.headers.set('X-RateLimit-Remaining', remaining.toString())
  }
  
  // Security headers
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '0') // Disabled as per modern recommendations
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Permissions-Policy: Allow camera and microphone for teleconsulta
  // Note: Some browsers may warn on unrecognized directives, so keep it minimal.
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  
  // HSTS - enable in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // CSP - Content Security Policy
  // Note: Next.js requires 'unsafe-inline' for styles and 'unsafe-eval' for development
  // In production, consider using nonces for scripts
  const isDev = process.env.NODE_ENV !== 'production'
  
  const csp = [
    "default-src 'self'",
    // Scripts: self + inline for Next.js hydration
    `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline'`,
    // Styles: self + inline for Tailwind/CSS-in-JS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self + data URIs + blob for uploads
    "img-src 'self' data: blob: https:",
    // Fonts: self + data URIs
    "font-src 'self' data: https://fonts.gstatic.com",
    // Connect: self + WebSocket for tele, Ollama for AI
    `connect-src 'self' ws: wss: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`,
    // Frame ancestors: none to prevent clickjacking
    "frame-ancestors 'none'",
    // Form action: self only
    "form-action 'self'",
    // Base URI: self only
    "base-uri 'self'",
    // Object src: none
    "object-src 'none'",
    // Upgrade insecure requests in production
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join('; ')
  
  res.headers.set('Content-Security-Policy', csp)
  
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
