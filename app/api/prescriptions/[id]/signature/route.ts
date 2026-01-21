import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/prescriptions/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
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

    return NextResponse.json({
      signed: true,
      signatureHash: signed.signatureHash,
      verificationUrl: `/api/digital-signatures/validate/${signed.signatureHash}`,
      signedAt: signed.signedAt,
      certificate: signed.certificate,
    })
  } catch (error) {
    logger.error('Erro ao obter assinatura da prescrição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
