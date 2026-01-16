import crypto from 'crypto'

const TOKEN_BYTES = 32

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

export function generatePasswordResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getBaseUrlFromRequest(req: Request): string {
  const envUrl = process.env.NEXTAUTH_URL
  if (envUrl) return envUrl

  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`

  return 'http://localhost:3000'
}

export function getClientIpFromRequest(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
