import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { signPdfWithPAdES } from '@/lib/documents/pades-signer'
import { generatePrescriptionPdfBuffer } from '@/lib/prescription-pdf-helpers'

/**
 * POST /api/prescriptions/[id]/sign
 *
 * Assina a prescrição com certificado A1 e gera PDF PAdES válido no ITI.
 * Fluxo:
 * 1. Gera o PDF da prescrição
 * 2. Assina o PDF com PAdES (assinatura embutida no arquivo)
 * 3. Salva o PDF assinado em disco (uploads/documents/prescription/{id}.pdf)
 * 4. Registra SignedDocument com hash do PDF assinado
 *
 * Assim o arquivo servido em GET /api/prescriptions/[id]/pdf será o mesmo
 * que pode ser validado em validar.iti.gov.br.
 */
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({})) as { password?: string }
    const password: string | undefined = body?.password
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória' }, { status: 400 })
    }

    // 1. Carregar prescrição com dados completos (mesmo include da rota de PDF)
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { include: { userAccount: { select: { id: true } } } },
        doctor: { include: { person: { select: { cpf: true } } } },
        items: { include: { medication: { select: { name: true } } } },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
    if (prescription.digitalSignature) {
      return NextResponse.json({ error: 'Prescrição já assinada' }, { status: 400 })
    }

    // 2. Certificado A1 ativo
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!userCertificate?.pfxFilePath) {
      return NextResponse.json(
        { error: 'Certificado digital A1 não configurado. Configure em Configurações > Certificados Digitais' },
        { status: 400 }
      )
    }

    const baseUrl = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.headers.get('host')
        ? `${(request.headers.get('x-forwarded-proto') || 'https')}://${request.headers.get('host')}`
        : ''

    // 3. Gerar PDF da prescrição (sem assinatura)
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generatePrescriptionPdfBuffer(prescription, baseUrl)
    } catch (genErr: any) {
      logger.error({ err: genErr, prescriptionId: id }, 'Erro ao gerar PDF para assinatura')
      return NextResponse.json(
        { error: 'Falha ao gerar o PDF da prescrição. Tente novamente.' },
        { status: 500 }
      )
    }

    // 4. Assinar PDF com PAdES (sem DocTimeStamp por enquanto)
    let signResult: Awaited<ReturnType<typeof signPdfWithPAdES>>
    try {
      signResult = await signPdfWithPAdES(
        pdfBuffer,
        userCertificate.pfxFilePath,
        password,
        {
          reason: 'Prescrição médica assinada digitalmente',
          location: 'Brasil',
          name: (user as any).name || 'Médico',
        }
      )
    } catch (sigErr: any) {
      logger.error({ err: sigErr, prescriptionId: id }, 'Erro PAdES ao assinar prescrição')
      if (sigErr?.message?.toLowerCase().includes('password')) {
        return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
      }
      if (sigErr?.message?.includes('CERTIFICATE_CHAIN_INCOMPLETE')) {
        return NextResponse.json({ error: 'Seu certificado A1 não contém a cadeia completa. Reexporte o .pfx com “incluir cadeia completa” (AC intermediária + raiz) e tente novamente.' }, { status: 400 })
      }
      if (sigErr?.message?.toLowerCase().includes('expired') || sigErr?.message?.toLowerCase().includes('expirado')) {
        return NextResponse.json({ error: 'Certificado digital expirado' }, { status: 400 })
      }
      if (sigErr?.message?.toLowerCase().includes('arquivo') || sigErr?.message?.toLowerCase().includes('corrompido')) {
        return NextResponse.json({ error: 'Certificado corrompido ou arquivo inválido' }, { status: 400 })
      }
      if (sigErr?.message?.toLowerCase().includes('not found')) {
        return NextResponse.json({ error: 'Arquivo do certificado não encontrado' }, { status: 404 })
      }
      return NextResponse.json(
        { error: sigErr?.message || 'Falha ao assinar documento. Verifique seu certificado e senha.' },
        { status: 500 }
      )
    }

    const signedPdf = signResult.signedPdf
    const signatureHash = crypto.createHash('sha256').update(signedPdf).digest('hex')

    // 5. Salvar PDF assinado em disco (para GET /api/prescriptions/[id]/pdf servir o arquivo válido no ITI)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
    await fs.mkdir(uploadsDir, { recursive: true })
    const filepath = path.join(uploadsDir, `${id}.pdf`)
    await fs.writeFile(filepath, signedPdf)
    logger.info('PDF PAdES salvo em disco', { prescriptionId: id, path: filepath })

    // 6. Atualizar prescrição (marcar como assinada; guardar referência curta)
    await prisma.prescription.update({
      where: { id },
      data: {
        digitalSignature: `PAdES:${signatureHash.slice(0, 16)}`,
        status: 'ACTIVE',
      } as any,
    })

    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })

    // 7. Registrar SignedDocument (hash do PDF assinado para nossa página /verify)
    await prisma.signedDocument.create({
      data: {
        documentType: 'PRESCRIPTION',
        documentId: String(id),
        certificateId: userCertificate.id,
        signerId: user.id,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: signedPdf.toString('base64').substring(0, 1000),
        signatureHash,
        signedAt: new Date(),
        isValid: true,
      },
    })

    return NextResponse.json({
      success: true,
      signedAt: signResult.signature.signedAt,
      signatureHash,
      verificationPageUrl: `/verify/${signatureHash}`,
      verificationUrl: `/api/digital-signatures/validate/${signatureHash}`,
      message: 'Prescrição assinada com PAdES. O PDF pode ser validado em validar.iti.gov.br.',
    })
  } catch (error) {
    logger.error('Erro ao assinar prescrição:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
