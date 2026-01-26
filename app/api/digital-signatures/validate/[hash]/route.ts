import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const hash = params?.hash
    if (!hash) {
      return NextResponse.json({ error: 'Hash não informado' }, { status: 400 })
    }

    const record = await prisma.signedDocument.findFirst({
      where: { signatureHash: String(hash) },
      include: {
        certificate: {
          select: {
            id: true,
            userId: true,
            certificateType: true,
            issuer: true,
            subject: true,
            serialNumber: true,
            notBefore: true,
            notAfter: true,
            isActive: true,
            revokedAt: true,
            revokedReason: true,
          }
        }
      }
    })

    if (!record) {
      return NextResponse.json({ valid: false, reason: 'ASSINATURA_NAO_ENCONTRADA' }, { status: 404 })
    }

    const now = new Date()
    const cert = record.certificate
    const withinValidity = cert.isActive && cert.notBefore <= now && cert.notAfter >= now

    const reason = !withinValidity
      ? 'CERTIFICADO_FORA_DA_JANELA_DE_VALIDADE_OU_INATIVO'
      : record.isValid
        ? null
        : 'ASSINATURA_NAO_VERIFICADA_CRIPTOGRAFICAMENTE'

    // This endpoint validates metadata and certificate validity window.
    // Full cryptographic verification should be done using the original content
    // and the certificate public key at the client or a dedicated HSM/verification service.
    const result = {
      valid: withinValidity && record.isValid,
      reason,
      signature: {
        id: record.id,
        documentType: record.documentType,
        documentId: record.documentId,
        signerId: record.signerId,
        signatureAlgorithm: record.signatureAlgorithm,
        signatureHash: record.signatureHash,
        signedAt: record.signedAt,
      },
      certificate: cert,
      validation: {
        validatedAt: new Date(),
        method: 'METADATA_AND_VALIDITY_WINDOW_ONLY',
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error('Erro ao validar assinatura:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao validar assinatura' },
      { status: 500 }
    )
  }
}
