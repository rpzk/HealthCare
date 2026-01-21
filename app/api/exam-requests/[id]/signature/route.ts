import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/exam-requests/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const exam = await prisma.examRequest.findUnique({ where: { id: String(id) } })
    if (!exam) return NextResponse.json({ error: 'Solicitação de exame não encontrada' }, { status: 404 })
    if (exam.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'EXAM_REQUEST', documentId: String(id) },
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
          },
        },
      },
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
    logger.error('Erro ao obter assinatura da solicitação de exame:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
