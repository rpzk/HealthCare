import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyRegistrationResponseForUser } from '@/lib/webauthn'
import type { RegistrationResponseJSON } from '@simplewebauthn/typescript-types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json() as { response: RegistrationResponseJSON; nickname?: string }
    if (!body?.response) {
      return NextResponse.json({ error: 'Resposta WebAuthn ausente' }, { status: 400 })
    }

    const verification = await verifyRegistrationResponseForUser(session.user.id, body.response, req as any)
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Falha na verificação da passkey' }, { status: 400 })
    }

    const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp, authenticatorAttachment } = verification.registrationInfo

    await (prisma as any).webAuthnCredential.create({
      data: {
        userId: session.user.id,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter: counter ?? 0,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp ?? false,
        authenticatorAttachment: authenticatorAttachment || undefined,
        transports: (body.response.response?.transports as string[] | undefined)?.join(',') || undefined,
        nickname: body.nickname?.slice(0, 100) || undefined,
      }
    })

    return NextResponse.json({ verified: true })
  } catch (error: any) {
    console.error('Erro ao verificar registro WebAuthn:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
