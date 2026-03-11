import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyRegistrationResponseForUser, WEBAUTHN_REG_CHALLENGE_COOKIE } from '@/lib/webauthn'
import type { RegistrationResponseJSON } from '@simplewebauthn/typescript-types'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json() as { response: RegistrationResponseJSON; nickname?: string }
    const resp = body?.response
    if (!resp?.id || !resp?.rawId || !resp?.response?.clientDataJSON || !resp?.response?.attestationObject) {
      return NextResponse.json({ error: 'Resposta WebAuthn inválida ou incompleta' }, { status: 400 })
    }

    const verification = await verifyRegistrationResponseForUser(session.user.id, resp, req as any)
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Falha na verificação da passkey' }, { status: 400 })
    }

    const regInfo = verification.registrationInfo as Record<string, unknown> | undefined
    // SimpleWebAuthn v13+: credential está em regInfo.credential { id, publicKey, counter, transports }
    // Versões antigas: credentialID e credentialPublicKey no nível raiz de regInfo
    const cred = regInfo?.credential as { id?: string; publicKey?: Uint8Array | ArrayBuffer } | undefined
    const credentialIDRaw = cred?.id ?? regInfo?.credentialID ?? regInfo?.credentialId
    let credentialID: Uint8Array | ArrayBuffer | string | undefined = credentialIDRaw as Uint8Array | ArrayBuffer | string | undefined
    if (!credentialID && resp.rawId) {
      credentialID = typeof resp.rawId === 'string'
        ? Buffer.from(resp.rawId, 'base64url')
        : new Uint8Array(resp.rawId as ArrayBuffer)
    }
    if (!credentialID && typeof resp.id === 'string') {
      credentialID = Buffer.from(resp.id, 'base64url')
    }
    const credentialPublicKey = (cred?.publicKey ?? regInfo?.credentialPublicKey) as Uint8Array | ArrayBuffer | string | undefined
    if (!credentialID || credentialPublicKey == null || (ArrayBuffer.isView(credentialPublicKey) && credentialPublicKey.byteLength === 0)) {
      logger.error('registrationInfo incompleto:', {
        hasCredentialID: !!credentialID,
        hasPublicKey: !!credentialPublicKey,
        regInfoKeys: regInfo ? Object.keys(regInfo) : [],
        hasCredential: !!cred
      })
      return NextResponse.json({
        error: 'Dados da passkey incompletos. A operação pode ter sido bloqueada ou o dispositivo não é compatível. Tente outro dispositivo ou certifique-se de permitir a operação.'
      }, { status: 400 })
    }

    const credentialIdB64 = typeof credentialID === 'string'
      ? credentialID
      : Buffer.from(new Uint8Array(credentialID as ArrayBuffer | Uint8Array)).toString('base64url')
    const publicKeyB64 = Buffer.from(new Uint8Array(credentialPublicKey as ArrayBuffer | Uint8Array)).toString('base64url')

    const credForMeta = cred as { counter?: number; transports?: string[] } | undefined
    const counter = credForMeta?.counter ?? (regInfo?.counter as number) ?? 0

    await (prisma as any).webAuthnCredential.create({
      data: {
        userId: session.user.id,
        credentialId: credentialIdB64,
        publicKey: publicKeyB64,
        counter: typeof counter === 'number' ? counter : 0,
        transports: (credForMeta?.transports?.join(',') ?? (resp.response?.transports as string[] | undefined)?.join(',')) || undefined,
        name: body.nickname?.slice(0, 100) || undefined,
      }
    })

    const res = NextResponse.json({ verified: true })
    // Limpar cookie de fallback após uso
    res.cookies.set(WEBAUTHN_REG_CHALLENGE_COOKIE, '', { maxAge: 0, path: '/' })
    return res
  } catch (error: any) {
    logger.error('Erro ao verificar registro WebAuthn:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
