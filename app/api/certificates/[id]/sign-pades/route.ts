/**
 * POST /api/certificates/[id]/sign-pades
 * 
 * Assina o PDF de um certificado com assinatura digital PAdES
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { signPdfWithA1PAdES } from '@/lib/pades-signer'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Autenticação
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = context.params

    // Buscar certificado médico
    const medicalCert = await prisma.medicalCertificate.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true },
        },
      },
    })

    if (!medicalCert) {
      return NextResponse.json(
        { error: 'Medical certificate not found' },
        { status: 404 }
      )
    }

    // Verificar permissão (usuário médico dono do cert, ou admin)
    const userRole = session.user.role as string
    if (
      userRole !== 'admin' &&
      session.user.id !== medicalCert.doctorId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only the issuing doctor can sign this certificate' },
        { status: 403 }
      )
    }

    // Ler o PDF gerado
    if (!medicalCert.pdfPath) {
      return NextResponse.json(
        { error: 'No PDF generated for this certificate' },
        { status: 400 }
      )
    }

    const pdfPath = path.join(process.cwd(), 'public', medicalCert.pdfPath)
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF file not found on disk' },
        { status: 404 }
      )
    }

    const pdfBuffer = fs.readFileSync(pdfPath)

    // Carregar variáveis de ambiente
    const pfxPath = process.env.A1_CERTIFICATE_PATH
    const pfxPassword = process.env.A1_CERTIFICATE_PASSWORD

    if (!pfxPath || !pfxPassword) {
      logger.error('[Sign-PAdES] Variáveis A1_CERTIFICATE_PATH ou A1_CERTIFICATE_PASSWORD não configuradas')
      return NextResponse.json(
        {
          error: 'Server configuration error: A1 certificate not configured',
        },
        { status: 500 }
      )
    }

    if (!fs.existsSync(pfxPath)) {
      logger.error('[Sign-PAdES] Certificado A1 não encontrado em:', pfxPath)
      return NextResponse.json(
        { error: 'A1 certificate file not found on server' },
        { status: 500 }
      )
    }

    logger.info('[Sign-PAdES] Iniciando assinatura', {
      certId: id,
      pdfSize: pdfBuffer.length,
    })

    // Assinar PDF com PAdES
    const signResult = await signPdfWithA1PAdES(pdfBuffer, pfxPath, pfxPassword, {
      reason: `Certificado Médico #${id}`,
      location: 'Brasil',
      contactInfo: session.user.email || '',
    })

    // Salvar PDF assinado
    const signedFilename = `cert-${id}-signed-${Date.now()}.pdf`
    const signedPdfPath = path.join(process.cwd(), 'public', 'certificates', signedFilename)

    // Criar diretório se não existir
    const signingDir = path.dirname(signedPdfPath)
    if (!fs.existsSync(signingDir)) {
      fs.mkdirSync(signingDir, { recursive: true })
    }

    fs.writeFileSync(signedPdfPath, signResult.signedPdf)
    logger.info('[Sign-PAdES] PDF assinado salvo em:', signedPdfPath)

    // Atualizar certificado com a assinatura
    const updatedCert = await prisma.medicalCertificate.update({
      where: { id },
      data: {
        signature: signResult.certificateInfo.subject,
        signatureMethod: 'ICP_BRASIL',
        certificateChain: JSON.stringify({
          issuer: signResult.certificateInfo.issuer,
          serialNumber: signResult.certificateInfo.serialNumber,
          validFrom: signResult.certificateInfo.validFrom,
          validTo: signResult.certificateInfo.validTo,
        }),
        timestamp: signResult.signedAt,
        pdfPath: `/certificates/${signedFilename}`,
      },
    })

    logger.info('[Sign-PAdES] Certificado atualizado com assinatura', {
      certId: id,
      signedAt: updatedCert.timestamp,
    })

    return NextResponse.json(
      {
        success: true,
        certificate: {
          id: updatedCert.id,
          signedAt: updatedCert.timestamp,
          signedPdfPath: updatedCert.pdfPath,
          signature: {
            method: updatedCert.signatureMethod,
            subject: signResult.certificateInfo.subject,
            issuer: signResult.certificateInfo.issuer,
            serialNumber: signResult.certificateInfo.serialNumber,
            validFrom: signResult.certificateInfo.validFrom,
            validTo: signResult.certificateInfo.validTo,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('[Sign-PAdES] Erro ao assinar certificado:', error)

    return NextResponse.json(
      {
        error: 'Failed to sign certificate',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
