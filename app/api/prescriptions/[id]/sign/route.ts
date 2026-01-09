import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { PrescriptionsServiceDb } from '@/lib/prescriptions-service'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // 1. Fetch prescription
    const prescription = await PrescriptionsServiceDb.getPrescriptionById(id as string)
    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    // 2. Check if user is the doctor who created it (or admin)
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // 3. Check if already signed
    if (prescription.digitalSignature) {
      return NextResponse.json({ error: 'Prescrição já assinada' }, { status: 400 })
    }

    // 4. Generate content for signing
    const contentToSign = JSON.stringify({
      id: prescription.id,
      medications: prescription.medications,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      date: prescription.createdAt
    })

    // 5. Locate user's active A1 certificate
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

    const body = await request.json().catch(() => ({})) as any
    const password: string | undefined = body?.password
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
    }
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    if (userCertificate.pfxPasswordHash && passwordHash !== userCertificate.pfxPasswordHash) {
      return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
    }

    // 6. Sign with A1
    const signatureResult = await signWithA1Certificate(
      contentToSign,
      userCertificate.pfxFilePath,
      password
    )

    // 7. Update database
    const updated = await prisma.prescription.update({
      where: { id: id as string },
      data: {
        digitalSignature: signatureResult.signature,
        status: 'ACTIVE'
      } as any
    })

    // 8. Update certificate usage
    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })

    // 9. Record SignedDocument (audit trail)
    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'PRESCRIPTION',
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

    return NextResponse.json({
      success: true,
      signature: (updated as any).digitalSignature,
      signedAt: signatureResult.signedAt,
      signatureHash,
      verificationUrl: `/api/digital-signatures/validate/${signatureHash}`,
    })

  } catch (error) {
    console.error('Erro ao assinar prescrição:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
