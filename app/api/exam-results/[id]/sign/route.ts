import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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
        { error: 'Certificado digital A1 não configurado. Configure seu certificado em Configurações > Certificados Digitais' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as any
    const password: string | undefined = body?.password
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
    }

    let signatureResult
    try {
      signatureResult = await signWithA1Certificate(
        contentToSign,
        userCertificate.pfxFilePath,
        password
      )
    } catch (sigError: any) {
      console.error('Erro ao assinar resultado de exame:', {
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
