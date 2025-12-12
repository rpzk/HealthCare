import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, type VerifiedRegistrationResponse, type VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/typescript-types'
import type { NextRequest } from 'next/server'
import { prisma } from './prisma'

const CHALLENGE_TTL_MS = 5 * 60 * 1000

const registrationChallenges = new Map<string, { challenge: string; expiresAt: number }>()
const authenticationChallenges = new Map<string, { challenge: string; expiresAt: number; email: string }>()

function getRpIdFromRequest(req?: NextRequest | { headers?: { get?: (name: string) => string | null } }): string {
  const hostHeader = req?.headers?.get?.('host') || req?.headers?.get?.('x-forwarded-host')
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID
  if (hostHeader) return hostHeader.split(':')[0]
  if (process.env.NEXTAUTH_URL) return new URL(process.env.NEXTAUTH_URL).hostname
  return 'localhost'
}

function getOrigin(): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  return 'http://localhost:3000'
}

function setRegistrationChallenge(userId: string, challenge: string) {
  registrationChallenges.set(userId, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS })
}

function consumeRegistrationChallenge(userId: string): string | null {
  const entry = registrationChallenges.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    registrationChallenges.delete(userId)
    return null
  }
  registrationChallenges.delete(userId)
  return entry.challenge
}

function setAuthenticationChallenge(email: string, challenge: string) {
  authenticationChallenges.set(email.toLowerCase(), { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS, email: email.toLowerCase() })
}

function consumeAuthenticationChallenge(email: string): string | null {
  const entry = authenticationChallenges.get(email.toLowerCase())
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    authenticationChallenges.delete(email.toLowerCase())
    return null
  }
  authenticationChallenges.delete(email.toLowerCase())
  return entry.challenge
}

export async function createRegistrationOptions(userId: string, email: string, req?: NextRequest) {
  // prisma client may not have typings for the webAuthn model in some generated clients
  const existing = await (prisma as any).webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true }
  })

  const rpID = getRpIdFromRequest(req)
  const options = await generateRegistrationOptions({
    rpName: 'HealthCare',
    rpID,
    userID: userId,
    userName: email,
    attestationType: 'none',
    excludeCredentials: existing.map((c: { credentialId: string }) => ({ id: Buffer.from(c.credentialId, 'base64url'), type: 'public-key' })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    }
  })
  setRegistrationChallenge(userId, options.challenge)
  return options
}

export async function verifyRegistrationResponseForUser(userId: string, response: RegistrationResponseJSON, req?: NextRequest): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = consumeRegistrationChallenge(userId)
  if (!expectedChallenge) {
    throw new Error('Desafio de registro ausente ou expirado')
  }
  const rpID = getRpIdFromRequest(req)
  const origin = getOrigin()
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
    userVerification: 'preferred',
  })
  setAuthenticationChallenge(email, options.challenge)
  return options
}

export async function verifyAuthenticationResponseForUser(email: string, response: AuthenticationResponseJSON, req?: NextRequest): Promise<VerifiedAuthenticationResponse & { credentialDBId: string }> {
  const expectedChallenge = consumeAuthenticationChallenge(email)
  if (!expectedChallenge) {
    throw new Error('Desafio de autenticação ausente ou expirado')
  }
  const credentialId = Buffer.from(response.rawId, 'base64url').toString('base64url')
  const credential = await (prisma as any).webAuthnCredential.findFirst({ where: { credentialId } })
  if (!credential) {
    throw new Error('Credencial não encontrada')
  }
  const rpID = getRpIdFromRequest(req)
  const origin = getOrigin()
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
