import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

type CertificateAuthority = 'A1' | 'A3' | 'A4'

/**
 * Cadastra certificado digital ICP-Brasil.
 *
 * Modos de uso:
 * - A1: envia também o .pfx em base64 e a senha, para permitir assinatura server-side.
 * - A3/A4: apenas metadados + PEM/pública (chave privada permanece no token).
 */
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
      tokenSerialNumber,
      // Campos adicionais para A1
      pfxBase64,
      pfxPassword,
    } = body ?? {}

    // Validação básica
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
      return NextResponse.json(
        { error: `Campos ausentes: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    if (!['A1', 'A3', 'A4'].includes(String(certificateType))) {
      return NextResponse.json(
        { error: 'certificateType inválido (A1|A3|A4)' },
        { status: 400 }
      )
    }

    // Se for A1 (software), exigimos pfx + senha para permitir assinatura real
    if (certificateType === 'A1') {
      const a1Missing: string[] = []
      if (!pfxBase64) a1Missing.push('pfxBase64')
      if (!pfxPassword) a1Missing.push('pfxPassword')

      if (a1Missing.length) {
        return NextResponse.json(
          {
            error: `Campos ausentes para certificado A1: ${a1Missing.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    // Datas
    const nb = new Date(notBefore)
    const na = new Date(notAfter)
    if (isNaN(nb.getTime()) || isNaN(na.getTime())) {
      return NextResponse.json(
        { error: 'Datas inválidas (notBefore/notAfter)' },
        { status: 400 }
      )
    }

    // Serial único
    const exists = await prisma.digitalCertificate.findUnique({
      where: { serialNumber },
    })
    if (exists) {
      return NextResponse.json(
        { error: 'Certificado com este serialNumber já existe' },
        { status: 409 }
      )
    }

    // Pré-criar registro para termos o ID ao salvar o .pfx (A1)
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
      },
    })

    // Se for A1, salvar o .pfx em disco e o hash da senha
    if (certificateType === 'A1' && pfxBase64 && pfxPassword) {
      try {
        const buffer = Buffer.from(pfxBase64, 'base64')

        const baseDir = path.join(process.cwd(), 'uploads', 'certificates')
        await fs.mkdir(baseDir, { recursive: true })

        const filename = `cert-${created.id}.pfx`
        const filePath = path.join(baseDir, filename)
        await fs.writeFile(filePath, buffer)

        const passwordHash = crypto
          .createHash('sha256')
          .update(pfxPassword)
          .digest('hex')

        await prisma.digitalCertificate.update({
          where: { id: created.id },
          data: {
            pfxFilePath: filePath,
            pfxPasswordHash: passwordHash,
          },
        })
      } catch (err) {
        logger.error('Erro ao salvar arquivo .pfx do certificado A1:', err)
        // Em caso de falha, desativa o certificado para evitar uso inconsistente
        await prisma.digitalCertificate.update({
          where: { id: created.id },
          data: {
            isActive: false,
            revokedAt: new Date(),
            revokedReason:
              'Falha ao salvar arquivo .pfx no servidor. Verifique armazenamento.',
          },
        })

        return NextResponse.json(
          {
            error:
              'Falha ao salvar o arquivo .pfx no servidor. Nenhum certificado ativo foi criado.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, certificate: created }, { status: 201 })
  } catch (error: any) {
    logger.error('Erro ao cadastrar certificado digital:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao cadastrar certificado' },
      { status: 500 }
    )
  }
}
