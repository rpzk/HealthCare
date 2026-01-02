import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'

/**
 * POST /api/certificates/sign-a1
 * 
 * Assina um atestado médico com certificado A1
 * 
 * Body:
 * {
 *   certificateId: string  // ID do atestado
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { certificateId } = body

    if (!certificateId) {
      return NextResponse.json(
        { error: 'certificateId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar atestado
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Atestado não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se usuário é o médico do atestado
    if (certificate.doctorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode assinar este atestado' },
        { status: 403 }
      )
    }

    // Verificar se já foi assinado
    if (certificate.signature) {
      return NextResponse.json(
        { error: 'Atestado já foi assinado' },
        { status: 400 }
      )
    }

    // Buscar certificado ativo do médico
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
        notAfter: {
          gte: new Date(), // Não expirado
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!userCertificate || !userCertificate.pfxFilePath) {
      return NextResponse.json(
        {
          error: 'Você não possui certificado A1 configurado',
          details: 'Faça upload do seu certificado A1 nas configurações',
        },
        { status: 400 }
      )
    }

    // A senha do certificado é solicitada no momento da assinatura (segurança)
    // Por enquanto, vamos aceitar a senha via body
    const pfxPassword = body.password

    if (!pfxPassword) {
      return NextResponse.json(
        {
          error: 'Senha do certificado é obrigatória',
          details: 'Forneça a senha do seu certificado A1',
        },
        { status: 400 }
      )
    }

    // Validar senha
    const passwordHash = crypto
      .createHash('sha256')
      .update(pfxPassword)
      .digest('hex')

    if (passwordHash !== userCertificate.pfxPasswordHash) {
      return NextResponse.json(
        { error: 'Senha do certificado incorreta' },
        { status: 401 }
      )
    }

    // Criar dados do documento para assinar
    const documentData = JSON.stringify({
      id: certificate.id,
      sequenceNumber: certificate.sequenceNumber,
      year: certificate.year,
      type: certificate.type,
      patientId: certificate.patientId,
      doctorId: certificate.doctorId,
      startDate: certificate.startDate.toISOString(),
      endDate: certificate.endDate?.toISOString(),
      days: certificate.days,
      content: certificate.content,
      createdAt: certificate.createdAt.toISOString(),
    })

    // Assinar com certificado A1 do usuário
    const signatureResult = await signWithA1Certificate(
      documentData,
      userCertificate.pfxFilePath,
      pfxPassword
    )

    // Atualizar estatísticas de uso do certificado
    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })

    // Atualizar atestado com assinatura
    const updated = await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        signature: signatureResult.signature,
        signatureMethod: 'ICP_BRASIL',
        timestamp: signatureResult.signedAt,
      },
    })

    // Registrar assinatura em SignedDocument para trilha de auditoria
    const signatureHash = crypto
      .createHash('sha256')
      .update(documentData)
      .digest('hex')

    await prisma.signedDocument.create({
      data: {
        documentType: 'MEDICAL_CERTIFICATE',
        documentId: certificateId,
        certificateId: userCertificate.id,
        signerId: session.user.id,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: signatureResult.signature,
        signatureHash,
        isValid: true,
        validatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Atestado assinado com sucesso',
      certificate: {
        id: updated.id,
        sequenceNumber: updated.sequenceNumber,
        signature: updated.signature,
        signatureMethod: updated.signatureMethod,
        signedAt: signatureResult.signedAt,
        certificateInfo: signatureResult.certificateInfo,
      },
    })

  } catch (error) {
    console.error('[Sign A1] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao assinar atestado',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
