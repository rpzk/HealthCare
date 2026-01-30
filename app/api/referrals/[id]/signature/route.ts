import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/referrals/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    // DEBUG LOG: record incoming signature check requests
    logger.warn('[SignatureCheck] referrals GET', { id, ip: String(_req.headers.get('x-forwarded-for') || _req.headers.get('x-real-ip') || _req.headers.get('x-cluster-client-ip') || 'unknown'), user: user?.id })
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // Ensure referral exists and belongs to the requesting doctor (or admin)
    const referral = await prisma.referral.findUnique({ where: { id: String(id) } })
    if (!referral) return NextResponse.json({ error: 'Encaminhamento não encontrado' }, { status: 404 })
    if (referral.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'REFERRAL', documentId: String(id) },
      orderBy: { signedAt: 'desc' },
      include: {
        certificate: {
          select: {
            id: true,
            userId: true,
            issuer: true,
            subject: true,
            serialNumber: true,
            notBefore: true,
            notAfter: true,
            isActive: true,
          }
        }
      }
    })

    if (!signed) return NextResponse.json({ signed: false })

    const now = new Date()
    const cert = signed.certificate
    const withinValidity = !!cert?.isActive && new Date(cert.notBefore) <= now && new Date(cert.notAfter) >= now
    const valid = withinValidity && !!signed.isValid
    const reason = !withinValidity
      ? 'CERTIFICADO_FORA_DA_JANELA_DE_VALIDADE_OU_INATIVO'
      : signed.isValid
        ? null
        : 'ASSINATURA_NAO_VERIFICADA_CRIPTOGRAFICAMENTE'

    return NextResponse.json({
      signed: true,
      valid,
      reason,
      signatureHash: signed.signatureHash,
      verificationUrl: `/api/digital-signatures/validate/${signed.signatureHash}`,
      signedAt: signed.signedAt,
      signatureAlgorithm: signed.signatureAlgorithm,
      isValid: signed.isValid,
      validationResult: signed.validationResult,
      certificate: signed.certificate,
    })
  } catch (error) {
    logger.error('Erro ao obter assinatura do encaminhamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
