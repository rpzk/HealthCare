import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import { resolveCertificatePath } from '@/lib/certificate-path'
import { getCertificatePassword } from '@/lib/certificate-session'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // 1) Load exam request
    const exam = await prisma.examRequest.findUnique({ where: { id: String(id) } })
    if (!exam) return NextResponse.json({ error: 'Solicitação de exame não encontrada' }, { status: 404 })

    // 2) Authorization: only the document author can sign (certificate is exclusive to its owner)
    if (exam.doctorId !== user.id) {
      return NextResponse.json(
        { error: 'Apenas o médico autor da solicitação pode assinar com seu certificado digital. O certificado é de uso exclusivo do titular.' },
        { status: 403 }
      )
    }

    // 3) Check if already signed via audit trail
    const alreadySigned = await prisma.signedDocument.findFirst({
      where: { documentType: 'EXAM_REQUEST', documentId: String(id) },
    })
    if (alreadySigned) {
      return NextResponse.json({ error: 'Solicitação de exame já assinada' }, { status: 400 })
    }

    // 4) Canonical content to sign
    const contentToSign = JSON.stringify({
      id: exam.id,
      patientId: exam.patientId,
      doctorId: exam.doctorId,
      examType: exam.examType,
      description: exam.description,
      urgency: exam.urgency,
      requestDate: exam.requestDate,
    })

    // 5) Locate user's active A1 certificate
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!userCertificate || !userCertificate.pfxFilePath) {
      return NextResponse.json(
        { error: 'Certificado digital A1 não configurado. Configure seu certificado em Configurações > Certificados Digitais' },
        { status: 400 }
      )
    }

    const certPath = await resolveCertificatePath(userCertificate.pfxFilePath)
    if (!certPath) {
      return NextResponse.json(
        { error: 'Arquivo do certificado não encontrado. Reenvie o certificado em Configurações > Certificados Digitais.' },
        { status: 404 }
      )
    }

    // 6) Senha: body ou sessão de certificado ativa
    const body = (await request.json().catch(() => ({}))) as { password?: string }
    let password: string | null | undefined = body?.password
    if (!password) {
      password = await getCertificatePassword(user.id)
    }
    if (!password) {
      return NextResponse.json(
        { error: 'Senha do certificado obrigatória ou ative a sessão de assinatura digital no menu superior' },
        { status: 400 }
      )
    }

    // 7) Sign content with proper error handling
    let signatureResult
    try {
      signatureResult = await signWithA1Certificate(
        contentToSign,
        certPath,
        password
      )
    } catch (sigError: any) {
      logger.error('Erro ao assinar solicitação de exame:', {
        error: sigError?.message,
        certificateId: userCertificate.id,
        userId: user.id
      })
      
      if (sigError?.message?.toLowerCase().includes('password')) {
        return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
      }
      if (sigError?.message?.toLowerCase().includes('expired') || sigError?.message?.toLowerCase().includes('expirado')) {
        return NextResponse.json({ error: 'Certificado digital expirado' }, { status: 400 })
      }
      if (sigError?.message?.toLowerCase().includes('not found')) {
        return NextResponse.json({ error: 'Arquivo do certificado não encontrado' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Falha ao assinar documento. Verifique seu certificado e senha.' 
      }, { status: 500 })
    }

    // 8) Audit trail (SignedDocument)
    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'EXAM_REQUEST',
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
    logger.error('Erro ao assinar solicitação de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
