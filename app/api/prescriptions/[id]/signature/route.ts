import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

// GET /api/prescriptions/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    // DEBUG LOG: record incoming signature check requests
    logger.warn('[SignatureCheck] prescriptions GET', { id, ip: String(_req.headers.get('x-forwarded-for') || _req.headers.get('x-real-ip') || _req.headers.get('x-cluster-client-ip') || 'unknown'), user: user?.id })
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // Only the signing doctor or admins can view signature details
    // We check ownership via the prescription itself first
    const prescription = await prisma.prescription.findUnique({ where: { id } })
    if (!prescription) return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'PRESCRIPTION', documentId: String(id) },
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
    logger.error({ err: error }, 'Erro ao obter assinatura da prescrição')
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
