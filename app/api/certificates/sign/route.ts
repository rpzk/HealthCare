/**
 * API Route: Assinar atestado com certificado ICP-Brasil (A1)
 * POST /api/certificates/sign
 * Compat wrapper para fluxo novo baseado em A1 por usuário.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signWithA1Certificate } from '@/lib/certificate-a1-signer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface SignCertificateRequest {
  certificateId: string
  password?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const userRole = session?.user?.role as string | undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as SignCertificateRequest
    const { certificateId, password } = body

    if (!certificateId) {
      return NextResponse.json(
        { error: 'certificateId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar certificado
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: { patient: true, doctor: true }
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Atestado não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (médico que criou ou admin)
    if (certificate.doctorId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não tem permissão para assinar este atestado' },
        { status: 403 }
      )
    }

    // Buscar certificado digital A1 ativo do médico
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
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

    if (!password) {
      return NextResponse.json(
        { error: 'Senha do certificado é obrigatória' },
        { status: 400 }
      )
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    if (userCertificate.pfxPasswordHash && passwordHash !== userCertificate.pfxPasswordHash) {
      return NextResponse.json(
        { error: 'Senha do certificado incorreta' },
        { status: 401 }
      )
    }

    // Preparar dados do documento
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

    // Assinar com A1
    const signatureResult = await signWithA1Certificate(
      documentData,
      userCertificate.pfxFilePath,
      password
    )

    // Atualizar uso do certificado
    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })

    // Atualizar atestado
    await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        signature: signatureResult.signature,
        digitalSignature: signatureResult.signature,
        signatureMethod: 'ICP_BRASIL',
        timestamp: signatureResult.signedAt,
        certificateChain: null,
      },
    })

    // Registrar em SignedDocument
    const signatureHash = crypto.createHash('sha256').update(documentData).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'MEDICAL_CERTIFICATE',
        documentId: certificateId,
        certificateId: userCertificate.id,
        signerId: userId,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: signatureResult.signature,
        signatureHash,
        isValid: true,
        validatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      certificateId,
      signature: signatureResult.signature,
      timestamp: signatureResult.signedAt,
      method: 'ICP-Brasil A1',
      certificateInfo: signatureResult.certificateInfo,
      message: 'Atestado assinado com sucesso',
    })
  } catch (error) {
    console.error('[ICP-Brasil] Erro ao assinar:', error)
    return NextResponse.json(
      {
        error: 'Falha ao assinar certificado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
