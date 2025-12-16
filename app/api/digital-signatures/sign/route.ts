import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export const runtime = 'nodejs'

type SignedDocumentType =
  | 'MEDICAL_RECORD'
  | 'MEDICAL_CERTIFICATE'
  | 'PRESCRIPTION'
  | 'EXAM_REQUEST'
  | 'EXAM_RESULT'
  | 'REFERRAL'
  | 'CONSENT_FORM'
  | 'TELECONSULTATION'
  | 'DISCHARGE_SUMMARY'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      certificateId,
      documentType,
      documentId,
      originalContent, // opcional; se enviado, calcularemos signatureHash aqui
      signatureHash,   // opcional; se não enviado, calculado de originalContent
      signatureValue,  // assinatura (base64), gerada via cliente/token
      signatureAlgorithm = 'SHA256withRSA',
      timestampAuthority,
      timestampToken
    } = body ?? {}

    // Validate
    const missing: string[] = []
    if (!certificateId) missing.push('certificateId')
    if (!documentType) missing.push('documentType')
    if (!documentId) missing.push('documentId')
    if (!signatureValue) missing.push('signatureValue')
    if (!originalContent && !signatureHash) missing.push('originalContent|signatureHash')
    if (missing.length) {
      return NextResponse.json({ error: `Campos ausentes: ${missing.join(', ')}` }, { status: 400 })
    }

    if (![
      'MEDICAL_RECORD','MEDICAL_CERTIFICATE','PRESCRIPTION','EXAM_REQUEST','EXAM_RESULT',
      'REFERRAL','CONSENT_FORM','TELECONSULTATION','DISCHARGE_SUMMARY'
    ].includes(String(documentType))) {
      return NextResponse.json({ error: 'documentType inválido' }, { status: 400 })
    }

    // Ensure certificate belongs to user & is active & not expired
    const cert = await prisma.digitalCertificate.findUnique({ where: { id: String(certificateId) } })
    if (!cert || cert.userId !== session.user.id) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
    }
    const now = new Date()
    if (!cert.isActive || cert.notAfter < now) {
      return NextResponse.json({ error: 'Certificado inativo/expirado' }, { status: 400 })
    }

    const computedHash = signatureHash || crypto.createHash('sha256').update(String(originalContent)).digest('hex')

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const record = await prisma.signedDocument.create({
      data: {
        documentType: documentType as SignedDocumentType,
        documentId: String(documentId),
        certificateId: cert.id,
        signerId: session.user.id,
        signatureAlgorithm: String(signatureAlgorithm),
        signatureValue: String(signatureValue),
        signatureHash: computedHash,
        timestampAuthority: timestampAuthority || null,
        timestampToken: timestampToken || null,
        timestampedAt: timestampToken ? new Date() : null,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        isValid: true,
        validatedAt: new Date(),
        validationResult: 'RECORDED',
      },
      select: {
        id: true, documentType: true, documentId: true,
        certificateId: true, signerId: true,
        signatureAlgorithm: true, signatureHash: true,
        timestampedAt: true, createdAt: true,
      }
    })

    // Update certificate usage
    await prisma.digitalCertificate.update({
      where: { id: cert.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
    })

    return NextResponse.json({ success: true, signed: record }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao registrar assinatura digital:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao registrar assinatura' },
      { status: 500 }
    )
  }
}
