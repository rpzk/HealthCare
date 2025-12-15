import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

type CertificateAuthority = 'A1' | 'A3' | 'A4'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      certificateType,
      issuer,
      subject,
      serialNumber,
      notBefore,
      notAfter,
      certificatePem,
      publicKeyPem,
      isHardwareToken = false,
      tokenSerialNumber
    } = body ?? {}

    // Basic validation
    const missing: string[] = []
    if (!certificateType) missing.push('certificateType')
    if (!issuer) missing.push('issuer')
    if (!subject) missing.push('subject')
    if (!serialNumber) missing.push('serialNumber')
    if (!notBefore) missing.push('notBefore')
    if (!notAfter) missing.push('notAfter')
    if (!certificatePem) missing.push('certificatePem')
    if (!publicKeyPem) missing.push('publicKeyPem')
    if (missing.length) {
      return NextResponse.json({ error: `Campos ausentes: ${missing.join(', ')}` }, { status: 400 })
    }

    if (!['A1', 'A3', 'A4'].includes(String(certificateType))) {
      return NextResponse.json({ error: 'certificateType inválido (A1|A3|A4)' }, { status: 400 })
    }

    // Dates
    const nb = new Date(notBefore)
    const na = new Date(notAfter)
    if (isNaN(nb.getTime()) || isNaN(na.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas (notBefore/notAfter)' }, { status: 400 })
    }

    // Ensure serial uniqueness
    const exists = await prisma.digitalCertificate.findUnique({ where: { serialNumber } })
    if (exists) {
      return NextResponse.json({ error: 'Certificado com este serialNumber já existe' }, { status: 409 })
    }

    const created = await prisma.digitalCertificate.create({
      data: {
        userId: session.user.id,
        certificateType: certificateType as CertificateAuthority,
        issuer,
        subject,
        serialNumber,
        notBefore: nb,
        notAfter: na,
        certificatePem,
        publicKeyPem,
        isHardwareToken: Boolean(isHardwareToken),
        tokenSerialNumber: tokenSerialNumber || null,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        certificateType: true,
        issuer: true,
        subject: true,
        serialNumber: true,
        notBefore: true,
        notAfter: true,
        isHardwareToken: true,
        tokenSerialNumber: true,
        isActive: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ success: true, certificate: created }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao cadastrar certificado digital:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao cadastrar certificado' },
      { status: 500 }
    )
  }
}
