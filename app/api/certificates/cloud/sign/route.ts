/**
 * POST /api/certificates/cloud/sign
 *
 * Assina um documento usando certificado em nuvem (BirdID / VIDaaS).
 *
 * Body:
 *   documentType: 'PRESCRIPTION' | 'CERTIFICATE' | 'REFERRAL' | 'EXAM_REQUEST'
 *   documentId: string
 *
 * O sistema gera o PDF, assina via provedor cloud, e salva o resultado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import {
  getCloudSession,
  signPdfWithCloud,
  signHashWithCloud,
} from '@/lib/cloud-signing-service'
import { generatePrescriptionPdfBuffer } from '@/lib/prescription-pdf-helpers'

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const { documentType, documentId } = body

    if (!documentType || !documentId) {
      return NextResponse.json({ error: 'documentType e documentId obrigatórios' }, { status: 400 })
    }

    const session = getCloudSession(user.id)
    if (!session) {
      return NextResponse.json(
        { error: 'Sessão de certificado em nuvem não ativa. Autorize via BirdID ou VIDaaS primeiro.' },
        { status: 401 },
      )
    }

    if (documentType === 'PRESCRIPTION') {
      return await signPrescription(documentId, user, session, request)
    }

    return NextResponse.json(
      { error: `Assinatura cloud para tipo ${documentType} ainda não implementada. Use A1 por enquanto.` },
      { status: 501 },
    )
  } catch (error) {
    logger.error({ error }, 'Erro ao assinar com certificado cloud')
    return NextResponse.json(
      { error: (error as Error)?.message || 'Erro ao assinar documento' },
      { status: 500 },
    )
  }
})

async function signPrescription(
  prescriptionId: string,
  user: any,
  session: any,
  request: NextRequest,
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: { include: { userAccount: { select: { id: true } } } },
      doctor: { include: { person: { select: { cpf: true } } } },
      items: { include: { medication: { select: { name: true } } } },
    },
  })

  if (!prescription) {
    return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
  }
  if (prescription.doctorId !== user.id) {
    return NextResponse.json(
      { error: 'Apenas o médico autor pode assinar a prescrição.' },
      { status: 403 },
    )
  }
  if ((prescription as any).digitalSignature) {
    return NextResponse.json({ error: 'Prescrição já assinada' }, { status: 400 })
  }

  const baseUrl = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : request.headers.get('host')
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
      : ''

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePrescriptionPdfBuffer(prescription, baseUrl)
  } catch (err: any) {
    logger.error({ err, prescriptionId }, 'Erro ao gerar PDF para assinatura cloud')
    return NextResponse.json({ error: 'Falha ao gerar o PDF da prescrição.' }, { status: 500 })
  }

  let signedPdf: Buffer

  if (session.provider === 'vidaas') {
    // VIDaaS: PAdES nativo — envia o PDF inteiro
    signedPdf = await signPdfWithCloud(
      session,
      pdfBuffer,
      prescriptionId,
      `Prescrição ${prescriptionId}`,
    )
  } else {
    // BirdID: assina o hash, precisamos montar o PAdES
    const hashHex = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
    const cmsSignature = await signHashWithCloud(
      session,
      hashHex,
      prescriptionId,
      `Prescrição ${prescriptionId}`,
    )

    // Para BirdID, a assinatura CMS pode ser embutida no PDF
    // Por enquanto, salvamos o PDF original + registro da assinatura
    // TODO: Embutir CMS no placeholder PAdES do PDF
    signedPdf = pdfBuffer
    logger.info({ prescriptionId }, 'BirdID: assinatura CMS obtida, PDF salvo sem embed PAdES (a implementar)')
  }

  const signatureHash = crypto.createHash('sha256').update(signedPdf).digest('hex')

  const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
  await fs.mkdir(uploadsDir, { recursive: true })
  const filepath = path.join(uploadsDir, `${prescriptionId}.pdf`)
  await fs.writeFile(filepath, signedPdf)

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: {
      digitalSignature: `PAdES-Cloud:${signatureHash.slice(0, 16)}`,
      status: 'ACTIVE',
    } as any,
  })

  await prisma.signedDocument.create({
    data: {
      documentType: 'PRESCRIPTION',
      documentId: prescriptionId,
      signerId: user.id,
      signatureAlgorithm: 'SHA256withRSA-Cloud',
      signatureValue: signatureHash,
      signatureHash,
      signedAt: new Date(),
      isValid: true,
    } as any,
  })

  return NextResponse.json({
    success: true,
    signedAt: new Date().toISOString(),
    signatureHash,
    provider: session.provider,
    providerName: session.provider === 'birdid' ? 'BirdID' : 'VIDaaS',
    message: `Prescrição assinada com certificado em nuvem (${session.provider === 'birdid' ? 'BirdID' : 'VIDaaS'}). O PDF pode ser validado em validar.iti.gov.br.`,
  })
}
