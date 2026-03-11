// ...existing code...
import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit, RateLimitPresets } from './lib/rate-limiter-factory'
import { logger } from './lib/logger'

const ROLES_REQUIRING_2FA = [
  'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST',
  'HEALTH_AGENT', 'TECHNICIAN', 'PHARMACIST', 'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER'
]
const PATHS_EXEMPT_FROM_2FA = ['/auth', '/settings', '/terms/accept', '/api']

function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Strip port if present (e.g., "1.2.3.4:1234")
  const withoutPort = trimmed.replace(/:(\d+)$/, '')
  return withoutPort || null
}

function parseForwardedForHeader(value: string | null): string | null {
  if (!value) return null
  const first = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)[0]
  return normalizeIp(first)
}

function parseForwardedHeader(value: string | null): string | null {
  // Example: Forwarded: for=203.0.113.43;proto=https;by=203.0.113.44
  if (!value) return null
  const forMatch = value.match(/for=(?:\"?)([^;\",\s]+)(?:\"?)/i)
  if (!forMatch) return null
  const raw = forMatch[1]
    .replace(/^\[/, '')
    .replace(/\]$/, '')
  return normalizeIp(raw)
}

function hashString(input: string): string {
  // Small stable hash to reduce key collisions when IP is missing/same behind proxy.
  // Not cryptographic; just for bucketing.
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function isAuthenticatedRequest(request: NextRequest): boolean {
  const tokenCookieNames = [
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    '__Secure-authjs.session-token',
    'authjs.session-token',
  ]
  for (const name of tokenCookieNames) {
    const v = request.cookies.get(name)?.value
    if (v && v.trim()) return true
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) return true

  return false
}

function getClientKey(request: NextRequest): string {
  const headers = request.headers

  // Prefer explicit proxy headers, then platform-provided request.ip when available.
  const ip =
    parseForwardedForHeader(headers.get('x-forwarded-for')) ||
    normalizeIp(headers.get('x-real-ip')) ||
    normalizeIp(headers.get('cf-connecting-ip')) ||
    parseForwardedHeader(headers.get('forwarded')) ||
    normalizeIp((request as any).ip) ||
    null

  const ua = (headers.get('user-agent') || '').trim()
  const uaKey = ua ? `ua:${hashString(ua)}` : 'ua:unknown'

  // Always include UA hash to avoid collisions behind shared proxies.
  if (ip) return `ip:${ip}|${uaKey}`
  return uaKey
}

// Generate nonce for CSP
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rotas de auth nunca passam por rate limit, logger ou redirect — garantem login sem interferência
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Logging global de todas as requisições API
  try {
    // Log básico de método, URL e headers
    logger.info('[API REQUEST]', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    })
  } catch (e) {
    // Ignora erro de log para não quebrar o middleware
  }

  // Skip rate limiting for static assets
  // (pathname já declarado no início)

  // Temporary hard block for signature-policy to contain client-side flood for specific clientKeys
  if (pathname === '/api/system/signature-policy') {
    // Read blocked client keys from env var BLOCKED_CLIENT_KEYS (comma-separated)
    const clientKey = (() => {
      try { return getClientKey(request) } catch (e) { return 'unknown' }
    })()

    const blockedEnv = process.env.BLOCKED_CLIENT_KEYS || ''
    const blocked = blockedEnv.split(',').map(s => s.trim()).filter(Boolean)
    const isBlocked = blocked.some(b => clientKey === b || clientKey.startsWith(b))

    if (isBlocked) {
      logger.warn('[RateLimitHardBlock] blocking signature-policy due to flood', { clientKey })
      return new NextResponse(JSON.stringify({ error: 'Too many requests - temporarily limited' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '300'
        }
      })
    }

    // Otherwise allow the request to proceed (normal rate limiting applies below)
    logger.info('[SignaturePolicy] allowed', { clientKey })
  }

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
  const isSignaturePolicyRoute = pathname === '/api/system/signature-policy'
  const isSignatureValidationRoute = pathname.startsWith('/api/digital-signatures/validate')
  
  const res = NextResponse.next()

  // Apply rate limiting using RateLimiterFactory only for API routes
  // (excluding /api/auth/* and /api/health).
  // NOTE: do NOT exclude signature policy from rate limiting — when many clients poll it can saturate browsers
  const skipRateLimit = isAuthApiRoute || isHealthRoute || isTeleApiRoute || isSignatureValidationRoute

  if (isApiRoute && !skipRateLimit) {
    // Authenticated read-only API calls from the UI should never be rate limited
    const authed = isAuthenticatedRequest(request)
    const method = request.method?.toUpperCase() || 'GET'
    const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'

    if (authed && isReadMethod) {
      return res
    }

    // Auto-selects Redis (production) or in-memory (development)
    const clientKey = getClientKey(request)

    const preset = authed && isReadMethod
      ? RateLimitPresets.ultraRelaxed
      : RateLimitPresets.standard

    const rateLimitResult = await checkRateLimit(clientKey, {
      ...preset,
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

  // Global auth redirect for page navigations (HTML), excluding public routes
  const isPageNavigation =
    !isApiRoute &&
    (request.headers.get('accept') || '').includes('text/html')

  if (isPageNavigation) {
    const authed = isAuthenticatedRequest(request)
    // 2FA obrigatório para ADMIN e DOCTOR
    if (authed) {
      const exempt = PATHS_EXEMPT_FROM_2FA.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!exempt) {
        try {
          const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
          const role = token?.role as string | undefined
          const twoFactorEnabled = token?.twoFactorEnabled === true
          if (role && ROLES_REQUIRING_2FA.includes(role) && !twoFactorEnabled) {
            const redirectUrl = new URL('/settings', request.url)
            redirectUrl.searchParams.set('tab', 'security')
            redirectUrl.searchParams.set('force2fa', 'true')
            return NextResponse.redirect(redirectUrl)
          }
        } catch (_e) {
          // Ignora erro (ex.: NEXTAUTH_SECRET ausente em build)
        }
      }
    }
    if (!authed) {
      const PUBLIC_PREFIXES = [
        '/',               // landing / home
        '/auth',           // login, register, reset
        '/questionnaire',  // questionários públicos por token
        '/invite',         // convites públicos
        '/verify',         // verificação de documentos
        '/certificates/validate',
        '/api',            // qualquer API (já tratado acima)
        '/docs',           // docs públicas
        '/help',           // ajuda pública
      ]

      const isPublic = PUBLIC_PREFIXES.some((prefix) =>
        pathname === prefix || pathname.startsWith(prefix + '/')
      )

      if (!isPublic) {
        const signInUrl = new URL('/auth/signin', request.url)
        const callback = request.nextUrl.pathname + request.nextUrl.search
        signInUrl.searchParams.set('callbackUrl', callback)
        return NextResponse.redirect(signInUrl)
      }
    }
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
