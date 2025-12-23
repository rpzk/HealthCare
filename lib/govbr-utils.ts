/**
 * Utilitários para integração com Gov.br
 * Assinatura digital OAuth 2.0
 */

import crypto from 'crypto'

/**
 * Gera hash SHA-256 de um documento
 * @param documentBuffer - Buffer do documento
 * @returns Hash em formato Base64
 */
export function generateDocumentHash(documentBuffer: Buffer | string): string {
  const buffer = typeof documentBuffer === 'string' 
    ? Buffer.from(documentBuffer, 'utf-8')
    : documentBuffer

  const hash = crypto.createHash('sha256').update(buffer).digest()
  return hash.toString('base64')
}

/**
 * Gera estado para validação OAuth
 * Previne CSRF attacks
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Valida se o estado OAuth é válido (você armazenaria em sessão/DB)
 */
export function validateOAuthState(state: string, expectedState: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(state),
    Buffer.from(expectedState)
  )
}

/**
 * Construa a URL de autorização do Gov.br
 */
export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  documentHash: string
): string {
  const authUrl = new URL(process.env.GOVBR_AUTHORIZATION_URL || 'https://sso.acesso.gov.br/authorize')
  
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('client_id', clientId)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('scope', 'signature_session')
  authUrl.searchParams.append('state', state)
  authUrl.searchParams.append('hash', documentHash)
  
  return authUrl.toString()
}

/**
 * Prepara corpo da requisição de token
 */
export function buildTokenRequestBody(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): URLSearchParams {
  const body = new URLSearchParams()
  body.append('grant_type', 'authorization_code')
  body.append('code', code)
  body.append('redirect_uri', redirectUri)
  body.append('client_id', clientId)
  body.append('client_secret', clientSecret)
  
  return body
}

/**
 * Interface para resposta de token
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

/**
 * Interface para sessão de assinatura
 */
export interface SignatureSession {
  sessionId: string
  state: string
  documentHash: string
  documentId: string
  createdAt: Date
  expiresAt: Date
}
