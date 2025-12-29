import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

// Use direct PrismaClient to avoid edge bundling issues
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient())

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // 1) Load referral
    const referral = await prisma.referral.findUnique({ where: { id: String(id) } })
    if (!referral) return NextResponse.json({ error: 'Encaminhamento não encontrado' }, { status: 404 })

    // 2) Authorization: only the author doctor or admins
    if (referral.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // 3) Check if already signed via audit trail
    const alreadySigned = await prisma.signedDocument.findFirst({
      where: { documentType: 'REFERRAL', documentId: String(id) },
    })
    if (alreadySigned) {
      return NextResponse.json({ error: 'Encaminhamento já assinado' }, { status: 400 })
    }

    // 4) Create canonical content to sign
    const contentToSign = JSON.stringify({
      id: referral.id,
      patientId: referral.patientId,
      doctorId: referral.doctorId,
      specialty: referral.specialty,
      description: referral.description,
      priority: referral.priority,
      createdAt: referral.createdAt,
    })

    // 5) Locate user's active A1 certificate
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

    // 6) Validate password
    const body = await request.json().catch(() => ({})) as any
    const password: string | undefined = body?.password
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
    }
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    if (userCertificate.pfxPasswordHash && passwordHash !== userCertificate.pfxPasswordHash) {
      return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
    }

    // 7) Sign content
    const signatureResult = await signWithA1Certificate(
      contentToSign,
      userCertificate.pfxFilePath,
      password
    )

    // 8) Audit trail (SignedDocument)
    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'REFERRAL',
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

    // 9) Update cert usage
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
    console.error('Erro ao assinar encaminhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
