import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/referrals/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
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

    return NextResponse.json({
      signed: true,
      signatureHash: signed.signatureHash,
      verificationUrl: `/api/digital-signatures/validate/${signed.signatureHash}`,
      signedAt: signed.signedAt,
      certificate: signed.certificate,
    })
  } catch (error) {
    logger.error('Erro ao obter assinatura do encaminhamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
