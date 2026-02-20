/**
 * Token de compartilhamento para prescrição: permite abrir o PDF sem login.
 * Formato: base64url(payload).base64url(hmac)
 * payload = { id: prescriptionId, exp: timestamp }
 */

import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'fallback-do-not-use-in-production'
const DEFAULT_EXPIRY_DAYS = 7

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (3 - (str.length % 4)) % 4)
  return Buffer.from(base64, 'base64')
}

export function createPrescriptionShareToken(prescriptionId: string, expiresInDays = DEFAULT_EXPIRY_DAYS): string {
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  const payload = JSON.stringify({ id: prescriptionId, exp })
  const payloadB64 = base64urlEncode(Buffer.from(payload, 'utf8'))
  const hmac = crypto.createHmac('sha256', SECRET).update(payloadB64).digest()
  const sigB64 = base64urlEncode(hmac)
  return `${payloadB64}.${sigB64}`
}

export function verifyPrescriptionShareToken(token: string, prescriptionId: string): boolean {
  if (!token || !prescriptionId) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sigB64] = parts
  try {
    const expectedHmac = crypto.createHmac('sha256', SECRET).update(payloadB64).digest()
    const expectedSig = base64urlEncode(expectedHmac)
    if (expectedSig !== sigB64) return false
    const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8')) as { id?: string; exp?: number }
    if (payload.id !== prescriptionId) return false
    if (!payload.exp || Date.now() > payload.exp) return false
    return true
  } catch {
    return false
  }
}

export { DEFAULT_EXPIRY_DAYS }
