import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, type VerifiedRegistrationResponse, type VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/typescript-types'
import type { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { createRedisCache } from './redis-integration'

const CHALLENGE_TTL_MS = 5 * 60 * 1000

const CHALLENGE_TTL_SECONDS = Math.ceil(CHALLENGE_TTL_MS / 1000)

/** Cookie usado como fallback quando Redis não está disponível (ex: dev sem Redis) */
export const WEBAUTHN_REG_CHALLENGE_COOKIE = 'webauthn_reg_challenge'
export const WEBAUTHN_AUTH_CHALLENGE_COOKIE = 'webauthn_auth_challenge'

function regChallengeKey(userId: string) {
  return `webauthn:reg:${userId}`
}

/** Obtém o desafio do cookie (fallback para ambiente dev sem Redis) */
function getChallengeFromCookie(req: Request | NextRequest | undefined): string | null {
  if (!req) return null
  const r = req as NextRequest & { cookies?: { get?: (n: string) => { value?: string } | undefined } }
  const fromCookiesApi = r.cookies?.get?.(WEBAUTHN_REG_CHALLENGE_COOKIE)?.value
  if (fromCookiesApi) return fromCookiesApi
  // Fallback: parsear header Cookie (quando req não é NextRequest)
  const raw = req.headers?.get?.('cookie')
  if (!raw) return null
  const match = raw.match(new RegExp(`${WEBAUTHN_REG_CHALLENGE_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

function authChallengeKey(email: string) {
  return `webauthn:auth:${email.toLowerCase()}`
}

/** Obtém o desafio de autenticação do cookie (fallback) */
function getAuthChallengeFromCookie(req: Request | NextRequest | undefined): string | null {
  if (!req) return null
  const r = req as NextRequest & { cookies?: { get?: (n: string) => { value?: string } | undefined } }
  const fromCookiesApi = r.cookies?.get?.(WEBAUTHN_AUTH_CHALLENGE_COOKIE)?.value
  if (fromCookiesApi) return fromCookiesApi
  // Fallback: parsear header Cookie
  const raw = req.headers?.get?.('cookie')
  if (!raw) return null
  const match = raw.match(new RegExp(`${WEBAUTHN_AUTH_CHALLENGE_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

function getRpIdFromRequest(req?: NextRequest | { headers?: { get?: (name: string) => string | null } }): string {
  const hostHeader = req?.headers?.get?.('x-forwarded-host') || req?.headers?.get?.('host')
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID
  if (hostHeader) return hostHeader.split(':')[0]
  if (process.env.NEXTAUTH_URL) return new URL(process.env.NEXTAUTH_URL).hostname
  return 'localhost'
}

function getOrigin(req?: NextRequest | { headers?: { get?: (name: string) => string | null } }): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  const proto = req?.headers?.get?.('x-forwarded-proto')
  const host = req?.headers?.get?.('x-forwarded-host') || req?.headers?.get?.('host')
  if (proto && host) return `${proto}://${host}`
  return 'http://localhost:3000'
}

async function setRegistrationChallenge(userId: string, challenge: string) {
  await createRedisCache().set(regChallengeKey(userId), { challenge }, CHALLENGE_TTL_SECONDS)
}

async function consumeRegistrationChallenge(userId: string, req?: Request | NextRequest): Promise<string | null> {
  const cache = createRedisCache()
  const entry = await cache.get<{ challenge: string }>(regChallengeKey(userId))
  await cache.delete(regChallengeKey(userId))
  const fromCache = entry?.challenge || null
  if (fromCache) return fromCache
  // Fallback: ler do cookie (ambiente dev sem Redis ou Redis inconsistente)
  return getChallengeFromCookie(req)
}

async function setAuthenticationChallenge(email: string, challenge: string) {
  await createRedisCache().set(authChallengeKey(email), { challenge }, CHALLENGE_TTL_SECONDS)
}

async function consumeAuthenticationChallenge(email: string, req?: Request | NextRequest): Promise<string | null> {
  const cache = createRedisCache()
  const key = authChallengeKey(email)
  const entry = await cache.get<{ challenge: string }>(key)
  await cache.delete(key)
  const fromCache = entry?.challenge || null
  if (fromCache) return fromCache
  // Fallback: ler do cookie
  return getAuthChallengeFromCookie(req)
}

export async function createRegistrationOptions(userId: string, email: string, req?: NextRequest) {
  // prisma client may not have typings for the webAuthn model in some generated clients
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true }
  })

  const rpID = getRpIdFromRequest(req)
  // Convert userId string to Uint8Array as required by SimpleWebAuthn v10+
  const userIdBuffer = new TextEncoder().encode(userId)

  const options = await generateRegistrationOptions({
    rpName: 'HealthCare',
    rpID,
    userID: userIdBuffer,
    userName: email,
    attestationType: 'none',
    excludeCredentials: existing
      .filter((c: { credentialId?: string | null }) => c.credentialId)
      .map((c: { credentialId: string }) => ({ id: c.credentialId, type: 'public-key' })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    }
  })
  await setRegistrationChallenge(userId, options.challenge)
  return options
}

export async function verifyRegistrationResponseForUser(userId: string, response: RegistrationResponseJSON, req?: NextRequest): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = await consumeRegistrationChallenge(userId, req)
  if (!expectedChallenge) {
    throw new Error('Desafio de registro ausente ou expirado')
  }
  const rpID = getRpIdFromRequest(req)
  const origin = getOrigin(req)
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })
  return verification
}

export async function createAuthenticationOptions(email: string, req?: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credentials = await (prisma as any).webAuthnCredential.findMany({
    where: { user: { email: { equals: email, mode: 'insensitive' } } },
    select: { credentialId: true, transports: true }
  })
  if (!credentials.length) throw new Error('Nenhuma passkey cadastrada para este usuário')

  const rpID = getRpIdFromRequest(req)
  const allowCredentials = credentials.map((c: { credentialId: string; transports?: string | null }) => ({
    id: c.credentialId,
    type: 'public-key',
    transports: (c.transports?.split(',') as AuthenticatorTransportFuture[]) || undefined
  }))
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'required',
  })
  await setAuthenticationChallenge(email, options.challenge)
  return options
}

export async function verifyAuthenticationResponseForUser(email: string, response: AuthenticationResponseJSON, req?: NextRequest): Promise<VerifiedAuthenticationResponse & { credentialDBId: string }> {
  const expectedChallenge = await consumeAuthenticationChallenge(email, req)
  if (!expectedChallenge) {
    throw new Error('Desafio de autenticação ausente ou expirado')
  }
  const credentialId = Buffer.from(response.rawId, 'base64url').toString('base64url')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = await (prisma as any).webAuthnCredential.findFirst({ where: { credentialId } })
  if (!credential) {
    throw new Error('Credencial não encontrada')
  }
  const rpID = getRpIdFromRequest(req)
  const origin = getOrigin(req)
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: Buffer.from(credential.credentialId, 'base64url'),
      publicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter,
      transports: credential.transports?.split(',') as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: true,
  })

  if (verification.verified) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      }
    })
  }

  return { ...verification, credentialDBId: credential.id }
}

export function getWebAuthnOrigin() {
  return getOrigin()
}

export function getWebAuthnRpId(req?: NextRequest) {
  return getRpIdFromRequest(req)
}
