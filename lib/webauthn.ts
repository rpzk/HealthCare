import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, type VerifiedRegistrationResponse, type VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/typescript-types'
import type { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { createRedisCache } from './redis-integration'

const CHALLENGE_TTL_MS = 5 * 60 * 1000

const CHALLENGE_TTL_SECONDS = Math.ceil(CHALLENGE_TTL_MS / 1000)

function regChallengeKey(userId: string) {
  return `webauthn:reg:${userId}`
}

function authChallengeKey(email: string) {
  return `webauthn:auth:${email.toLowerCase()}`
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

async function consumeRegistrationChallenge(userId: string): Promise<string | null> {
  const cache = createRedisCache()
  const entry = await cache.get<{ challenge: string }>(regChallengeKey(userId))
  await cache.delete(regChallengeKey(userId))
  return entry?.challenge || null
}

async function setAuthenticationChallenge(email: string, challenge: string) {
  await createRedisCache().set(authChallengeKey(email), { challenge }, CHALLENGE_TTL_SECONDS)
}

async function consumeAuthenticationChallenge(email: string): Promise<string | null> {
  const cache = createRedisCache()
  const key = authChallengeKey(email)
  const entry = await cache.get<{ challenge: string }>(key)
  await cache.delete(key)
  return entry?.challenge || null
}

export async function createRegistrationOptions(userId: string, email: string, req?: NextRequest) {
  // prisma client may not have typings for the webAuthn model in some generated clients
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
    excludeCredentials: existing.map((c: { credentialId: string }) => ({ id: Buffer.from(c.credentialId, 'base64url'), type: 'public-key' })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    }
  })
  await setRegistrationChallenge(userId, options.challenge)
  return options
}

export async function verifyRegistrationResponseForUser(userId: string, response: RegistrationResponseJSON, req?: NextRequest): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = await consumeRegistrationChallenge(userId)
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
  const credentials = await (prisma as any).webAuthnCredential.findMany({
    where: { user: { email: { equals: email, mode: 'insensitive' } } },
    select: { credentialId: true, transports: true }
  })
  if (!credentials.length) throw new Error('Nenhuma passkey cadastrada para este usuário')

  const rpID = getRpIdFromRequest(req)
  const allowCredentials = credentials.map((c: { credentialId: string; transports?: string | null }) => ({
    id: Buffer.from(c.credentialId, 'base64url'),
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
  const expectedChallenge = await consumeAuthenticationChallenge(email)
  if (!expectedChallenge) {
    throw new Error('Desafio de autenticação ausente ou expirado')
  }
  const credentialId = Buffer.from(response.rawId, 'base64url').toString('base64url')
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
