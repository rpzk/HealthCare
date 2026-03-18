/**
 * Cloud Signing Service — adapter unificado para BirdID (Soluti) e VIDaaS (VALID)
 *
 * Ambos provedores seguem estrutura similar baseada em OAuth2 + PKCE:
 *   1. authorize (QR Code ou Push) → code
 *   2. token (exchange code → access_token)
 *   3. signature (hash ou PDF → assinatura)
 *
 * Referências:
 * - BirdID: https://docs.vaultid.com.br/workspace/cloud
 * - VIDaaS: https://valid-sa.atlassian.net/wiki/spaces/PDD/pages/958365697
 */

import crypto from 'crypto'
import { logger } from '@/lib/logger'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type CloudProvider = 'birdid' | 'vidaas'

export type AuthMethod = 'qrcode' | 'push'

export type SignatureScope =
  | 'single_signature'
  | 'multi_signature'
  | 'signature_session'

export interface CloudProviderConfig {
  provider: CloudProvider
  clientId: string
  clientSecret: string
  baseUrl: string
  redirectUri: string
}

export interface CloudAuthSession {
  provider: CloudProvider
  accessToken: string
  expiresAt: Date
  scope: SignatureScope
  cpf: string
  certificateAlias?: string
}

export interface CloudSignatureRequest {
  documentId: string
  documentAlias: string
  hashHex: string
  signatureFormat: 'RAW' | 'CMS' | 'PAdES_AD_RB' | 'PAdES_AD_RT'
  pdfBase64?: string
}

export interface CloudSignatureResult {
  id: string
  rawSignature: string
  certificateAlias?: string
}

export interface UserDiscoveryResult {
  found: boolean
  slots: Array<{ alias: string; label: string }>
}

export interface PushAuthStatus {
  completed: boolean
  authorizationToken?: string
  code?: string
}

// ─── Config helpers ─────────────────────────────────────────────────────────

const PROVIDER_URLS: Record<CloudProvider, { production: string; homolog: string }> = {
  birdid: {
    production: 'https://api.birdid.com.br',
    homolog: 'https://api-hml.birdid.com.br',
  },
  vidaas: {
    production: 'https://certificado.vidaas.com.br',
    homolog: 'https://hml-certificado.vidaas.com.br',
  },
}

function getProviderBaseUrl(provider: CloudProvider): string {
  const env = process.env.CLOUD_CERT_ENVIRONMENT || 'production'
  return PROVIDER_URLS[provider][env === 'homolog' ? 'homolog' : 'production']
}

export function getProviderConfig(provider: CloudProvider): CloudProviderConfig | null {
  const prefix = provider === 'birdid' ? 'BIRDID' : 'VIDAAS'
  const clientId = process.env[`${prefix}_CLIENT_ID`]
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]
  const redirectUri = process.env[`${prefix}_REDIRECT_URI`] || process.env.CLOUD_CERT_REDIRECT_URI

  if (!clientId || !clientSecret) return null

  return {
    provider,
    clientId,
    clientSecret,
    baseUrl: getProviderBaseUrl(provider),
    redirectUri: redirectUri || '',
  }
}

export function getAvailableProviders(): CloudProvider[] {
  const providers: CloudProvider[] = []
  if (getProviderConfig('vidaas')) providers.push('vidaas')
  if (getProviderConfig('birdid')) providers.push('birdid')
  return providers
}

// ─── PKCE (RFC 7636) ────────────────────────────────────────────────────────

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}

// ─── 1. User Discovery ─────────────────────────────────────────────────────

export async function discoverUser(
  provider: CloudProvider,
  cpf: string,
): Promise<UserDiscoveryResult> {
  const config = getProviderConfig(provider)
  if (!config) throw new Error(`Provedor ${provider} não configurado`)

  const cleanCpf = cpf.replace(/\D/g, '').padStart(11, '0')

  // VIDaaS usa /v0/oauth/user-discovery; BirdID usa endpoint similar
  const url = `${config.baseUrl}/v0/oauth/user-discovery`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      user_cpf_cnpj: 'CPF',
      val_cpf_cnpj: cleanCpf,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.warn({ provider, status: res.status, body: text }, 'user-discovery falhou')
    return { found: false, slots: [] }
  }

  const data = await res.json()
  if (data.status === 'S' && Array.isArray(data.slots)) {
    return {
      found: true,
      slots: data.slots.map((s: any) => ({
        alias: s.slot_alias || s.alias || '',
        label: s.label || '',
      })),
    }
  }

  return { found: false, slots: [] }
}

// ─── 2. Authorization ───────────────────────────────────────────────────────

export interface AuthorizeUrlParams {
  provider: CloudProvider
  cpf: string
  scope?: SignatureScope
  lifetime?: number
  state?: string
  method?: AuthMethod
}

/**
 * Gera a URL de autorização OAuth2 (para QR Code ou redirect).
 * Para Push, use `startPushAuthorization`.
 */
export function buildAuthorizeUrl(
  params: AuthorizeUrlParams,
  pkce: { codeChallenge: string },
): string {
  const config = getProviderConfig(params.provider)
  if (!config) throw new Error(`Provedor ${params.provider} não configurado`)

  const cleanCpf = params.cpf.replace(/\D/g, '').padStart(11, '0')
  const scope = params.scope || 'signature_session'
  const lifetime = params.lifetime || 14400 // 4h default

  const qs = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    scope,
    login_hint: cleanCpf,
    lifetime: String(lifetime),
    redirect_uri: config.redirectUri,
  })

  if (params.state) qs.set('state', params.state)

  return `${config.baseUrl}/v0/oauth/authorize?${qs.toString()}`
}

/**
 * Inicia autorização via Push (notificação no celular).
 * Retorna um code para polling.
 */
export async function startPushAuthorization(
  params: AuthorizeUrlParams,
  pkce: { codeChallenge: string },
): Promise<{ code: string }> {
  const config = getProviderConfig(params.provider)
  if (!config) throw new Error(`Provedor ${params.provider} não configurado`)

  const cleanCpf = params.cpf.replace(/\D/g, '').padStart(11, '0')
  const scope = params.scope || 'signature_session'
  const lifetime = params.lifetime || 14400

  const qs = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    scope,
    login_hint: cleanCpf,
    lifetime: String(lifetime),
    redirect_uri: 'push://',
  })

  const url = `${config.baseUrl}/v0/oauth/authorize?${qs.toString()}`
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Push authorization falhou (${res.status}): ${text}`)
  }

  // A resposta vem como redirect ou JSON com code
  const text = await res.text()
  const codeMatch = text.match(/code=([^&\s"]+)/)
  if (codeMatch) {
    return { code: codeMatch[1] }
  }

  try {
    const json = JSON.parse(text)
    if (json.code) return { code: json.code }
  } catch { /* not json */ }

  throw new Error('Não foi possível obter código de autorização via push')
}

/**
 * Polling para verificar se o usuário autorizou via Push (VIDaaS).
 */
export async function checkPushAuthStatus(
  provider: CloudProvider,
  code: string,
): Promise<PushAuthStatus> {
  const config = getProviderConfig(provider)
  if (!config) throw new Error(`Provedor ${provider} não configurado`)

  // VIDaaS usa /valid/api/v1/trusted-services/authentications
  // BirdID usa flow diferente (async-signature com webhook)
  if (provider === 'vidaas') {
    const url = `${config.baseUrl}/valid/api/v1/trusted-services/authentications?code=${encodeURIComponent(code)}`
    const res = await fetch(url)

    if (!res.ok) {
      return { completed: false }
    }

    const data = await res.json()
    if (data.authorizationToken) {
      return {
        completed: true,
        authorizationToken: data.authorizationToken,
        code: data.authorizationToken,
      }
    }
    return { completed: false }
  }

  // BirdID: o code do push já é final
  return { completed: true, code }
}

// ─── 3. Token Exchange ──────────────────────────────────────────────────────

export async function exchangeCodeForToken(
  provider: CloudProvider,
  code: string,
  codeVerifier: string,
): Promise<CloudAuthSession> {
  const config = getProviderConfig(provider)
  if (!config) throw new Error(`Provedor ${provider} não configurado`)

  const url = `${config.baseUrl}/v0/oauth/token`

  const bodyData: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
  }

  // VIDaaS pode precisar de redirect_uri
  if (provider === 'vidaas' && config.redirectUri && config.redirectUri !== 'push://') {
    bodyData.redirect_uri = config.redirectUri
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(bodyData),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error({ provider, status: res.status, body: text }, 'Token exchange falhou')
    throw new Error(`Falha ao obter token do ${provider}: ${res.status}`)
  }

  const data = await res.json()

  return {
    provider,
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    scope: data.scope || 'signature_session',
    cpf: data.authorized_identification || '',
    certificateAlias: data.certificate_alias,
  }
}

// ─── 4. Signature ───────────────────────────────────────────────────────────

/**
 * Assina hashes usando certificado em nuvem.
 * Para VIDaaS com PAdES, envie pdfBase64 no request.
 */
export async function signWithCloudCertificate(
  session: CloudAuthSession,
  requests: CloudSignatureRequest[],
): Promise<CloudSignatureResult[]> {
  const config = getProviderConfig(session.provider)
  if (!config) throw new Error(`Provedor ${session.provider} não configurado`)

  if (new Date() >= session.expiresAt) {
    throw new Error('Sessão de assinatura em nuvem expirada. Autorize novamente.')
  }

  const url = `${config.baseUrl}/v0/oauth/signature`

  const hashes = requests.map((req) => {
    const item: Record<string, any> = {
      id: req.documentId,
      alias: req.documentAlias,
      hash: req.hashHex,
      hash_algorithm: '2.16.840.1.101.3.4.2.1', // SHA-256 OID
      signature_format: req.signatureFormat,
    }
    if (req.pdfBase64) {
      item.base64_content = req.pdfBase64
    }
    return item
  })

  const body: Record<string, any> = { hashes }
  if (session.certificateAlias) {
    body.certificate_alias = session.certificateAlias
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error({ provider: session.provider, status: res.status, body: text }, 'Cloud signature falhou')

    if (res.status === 401) {
      throw new Error('Token de assinatura expirado ou revogado. Autorize novamente.')
    }
    throw new Error(`Falha na assinatura em nuvem (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()

  const results: CloudSignatureResult[] = (data.signatures || []).map((sig: any) => ({
    id: sig.id,
    rawSignature: sig.raw_signature,
    certificateAlias: data.certificate_alias,
  }))

  logger.info(
    { provider: session.provider, count: results.length },
    'Assinatura(s) em nuvem realizadas com sucesso',
  )

  return results
}

/**
 * Assina um PDF usando VIDaaS com PAdES nativo.
 * Envia o PDF inteiro e recebe de volta o PDF assinado.
 */
export async function signPdfWithCloud(
  session: CloudAuthSession,
  pdfBuffer: Buffer,
  documentId: string,
  documentAlias: string,
): Promise<Buffer> {
  if (session.provider !== 'vidaas') {
    throw new Error(
      'Assinatura PAdES nativa só disponível com VIDaaS. ' +
      'Para BirdID, use signWithCloudCertificate com formato CMS e monte o PAdES manualmente.',
    )
  }

  const pdfBase64 = pdfBuffer.toString('base64')
  const hashHex = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

  const results = await signWithCloudCertificate(session, [
    {
      documentId,
      documentAlias,
      hashHex,
      signatureFormat: 'PAdES_AD_RB',
      pdfBase64,
    },
  ])

  if (!results.length || !results[0].rawSignature) {
    throw new Error('Provedor não retornou PDF assinado')
  }

  // VIDaaS retorna o PDF assinado em base64 quando base64_content é fornecido
  const cleanB64 = results[0].rawSignature.replace(/\r?\n/g, '')
  return Buffer.from(cleanB64, 'base64')
}

/**
 * Assina um hash com BirdID e retorna a assinatura CMS para ser embutida no PDF.
 */
export async function signHashWithCloud(
  session: CloudAuthSession,
  hashHex: string,
  documentId: string,
  documentAlias: string,
): Promise<string> {
  const results = await signWithCloudCertificate(session, [
    {
      documentId,
      documentAlias,
      hashHex,
      signatureFormat: 'CMS',
    },
  ])

  if (!results.length || !results[0].rawSignature) {
    throw new Error('Provedor não retornou assinatura')
  }

  return results[0].rawSignature
}

// ─── 5. Certificate Discovery ───────────────────────────────────────────────

export async function getCertificateInfo(
  session: CloudAuthSession,
): Promise<{ alias: string; certificate: string } | null> {
  const config = getProviderConfig(session.provider)
  if (!config) return null

  if (!session.certificateAlias) return null

  const url = `${config.baseUrl}/v0/oauth/certificate-discovery?certificate_alias=${encodeURIComponent(session.certificateAlias)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (data.status === 'S' && data.certificates?.length) {
    return {
      alias: data.certificates[0].alias,
      certificate: data.certificates[0].certificate,
    }
  }

  return null
}

// ─── 6. Cloud Session Store ─────────────────────────────────────────────────

const cloudSessions = new Map<string, string>()

function encryptSession(session: CloudAuthSession, userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET não configurado')
  const key = crypto.pbkdf2Sync(secret, `cloud-${userId}`, 100000, 32, 'sha256')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let enc = cipher.update(JSON.stringify(session), 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc}`
}

function decryptSession(data: string, userId: string): CloudAuthSession | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) return null
    const key = crypto.pbkdf2Sync(secret, `cloud-${userId}`, 100000, 32, 'sha256')
    const [ivHex, tagHex, enc] = data.split(':')
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex'),
    )
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    let dec = decipher.update(enc, 'hex', 'utf8')
    dec += decipher.final('utf8')
    const parsed = JSON.parse(dec)
    parsed.expiresAt = new Date(parsed.expiresAt)
    return parsed
  } catch {
    return null
  }
}

export function storeCloudSession(userId: string, session: CloudAuthSession): void {
  cloudSessions.set(userId, encryptSession(session, userId))
}

export function getCloudSession(userId: string): CloudAuthSession | null {
  const data = cloudSessions.get(userId)
  if (!data) return null
  const session = decryptSession(data, userId)
  if (!session) return null
  if (new Date() >= session.expiresAt) {
    cloudSessions.delete(userId)
    return null
  }
  return session
}

export function clearCloudSession(userId: string): void {
  cloudSessions.delete(userId)
}

export function hasActiveCloudSession(userId: string): boolean {
  return getCloudSession(userId) !== null
}

// PKCE verifiers store (temporary, used between authorize and callback)
const pkceStore = new Map<string, { codeVerifier: string; provider: CloudProvider; cpf: string }>()

export function storePKCE(
  state: string,
  data: { codeVerifier: string; provider: CloudProvider; cpf: string },
): void {
  pkceStore.set(state, data)
  setTimeout(() => pkceStore.delete(state), 5 * 60 * 1000)
}

export function getPKCE(
  state: string,
): { codeVerifier: string; provider: CloudProvider; cpf: string } | null {
  const data = pkceStore.get(state)
  if (data) pkceStore.delete(state)
  return data || null
}
