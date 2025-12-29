import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient())

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // Only admins and doctors can sign exam results
    if (user.role !== 'ADMIN' && user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const result = await prisma.examResult.findUnique({ where: { id: String(id) } })
    if (!result) return NextResponse.json({ error: 'Resultado de exame não encontrado' }, { status: 404 })

    // Prevent duplicate signing
    const alreadySigned = await prisma.signedDocument.findFirst({
      where: { documentType: 'EXAM_RESULT', documentId: String(id) },
    })
    if (alreadySigned) {
      return NextResponse.json({ error: 'Resultado de exame já assinado' }, { status: 400 })
    }

    const contentToSign = JSON.stringify({
      id: result.id,
      patientId: result.patientId,
      examType: result.examType,
      results: result.results,
      examDate: result.examDate,
      sourceDocument: result.sourceDocument || null,
    })

    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!userCertificate || !userCertificate.pfxFilePath) {
      return NextResponse.json(
        { error: 'Certificado A1 não configurado para o usuário' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as any
    const password: string | undefined = body?.password
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
    }
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    if (userCertificate.pfxPasswordHash && passwordHash !== userCertificate.pfxPasswordHash) {
      return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
    }

    const signatureResult = await signWithA1Certificate(
      contentToSign,
      userCertificate.pfxFilePath,
      password
    )

    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'EXAM_RESULT',
        documentId: String(id),
        certificateId: userCertificate.id,
        signerId: user.id,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: signatureResult.signature,
        signatureHash,
        isValid: true,
        validatedAt: new Date(),
      },
    })

    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      signature: signatureResult.signature,
      signedAt: signatureResult.signedAt,
      signatureHash,
      verificationUrl: `/api/digital-signatures/validate/${signatureHash}`,
    })
  } catch (error) {
    console.error('Erro ao assinar resultado de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
