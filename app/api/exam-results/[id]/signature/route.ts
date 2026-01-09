import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET /api/exam-results/[id]/signature
export const GET = withAuth(async (_req, { params, user }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const result = await prisma.examResult.findUnique({ where: { id: String(id) } })
    if (!result) return NextResponse.json({ error: 'Resultado de exame não encontrado' }, { status: 404 })

    if (user.role !== 'ADMIN' && user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'EXAM_RESULT', documentId: String(id) },
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
    console.error('Erro ao obter assinatura do resultado de exame:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
