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

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'
import { extractSignature } from '@signpdf/utils'
import {
  getCloudSession,
  signPdfWithCloud,
  signHashWithCloud,
} from '@/lib/cloud-signing-service'
import { generatePrescriptionPdfBuffer } from '@/lib/prescription-pdf-helpers'

/**
 * Embeds a CMS signature from BirdID into a PDF signature placeholder.
 *
 * BirdID only signs a hash, so we must:
 *  1. Add a PAdES placeholder to the PDF
 *  2. Hash the signed byte ranges (excluding the placeholder)
 *  3. Send the hash to BirdID and get a CMS back
 *  4. Write the CMS hex into the placeholder slot
 */
async function embedBirdIdSignature(
  pdfBuffer: Buffer,
  session: { cpf: string; provider: string },
  documentId: string,
  documentAlias: string,
  signHashFn: (hashHex: string, docId: string, alias: string) => Promise<string>,
): Promise<Buffer> {
  const SIGNATURE_LENGTH = 16384 // 8 KB hex placeholder; adjust if BirdID returns larger CMS

  // 1. Add signature placeholder
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: 'Assinatura digital ICP-Brasil',
    contactInfo: session.cpf,
    name: documentAlias,
    location: 'Brasil',
    signatureLength: SIGNATURE_LENGTH,
  })

  // 2. Extract ByteRange — [offset1, length1, offset2, length2]
  const { ByteRange } = extractSignature(pdfWithPlaceholder)

  // 3. Concatenate the signed byte ranges and hash them
  const signedData = Buffer.concat([
    pdfWithPlaceholder.slice(ByteRange[0], ByteRange[0] + ByteRange[1]),
    pdfWithPlaceholder.slice(ByteRange[2], ByteRange[2] + ByteRange[3]),
  ])
  const hashHex = crypto.createHash('sha256').update(signedData).digest('hex')

  // 4. Sign hash with BirdID; rawSignature is base64-encoded DER CMS
  const cmsBase64 = await signHashFn(hashHex, documentId, documentAlias)
  const cmsHex = Buffer.from(cmsBase64, 'base64').toString('hex')

  // 5. Write CMS hex into the /Contents placeholder slot
  //    The slot starts right after ByteRange[1] bytes + '<' and ends right before '>'
  const contentsStart = ByteRange[0] + ByteRange[1] + 1 // +1 skips the '<'
  const contentsLength = ByteRange[2] - contentsStart - 1 // -1 skips the '>'

  if (cmsHex.length > contentsLength) {
    throw new Error(
      `CMS do BirdID (${cmsHex.length} chars hex) excede o placeholder (${contentsLength} chars). ` +
      `Aumente SIGNATURE_LENGTH no código.`,
    )
  }

  const result = Buffer.from(pdfWithPlaceholder)
  result.write(cmsHex.padEnd(contentsLength, '0'), contentsStart, 'ascii')
  return result
}

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
    // BirdID: hash-based signing — prepare PAdES placeholder, sign, embed CMS
    signedPdf = await embedBirdIdSignature(
      pdfBuffer,
      session,
      prescriptionId,
      `Prescrição ${prescriptionId}`,
      (hashHex, docId, alias) => signHashWithCloud(session, hashHex, docId, alias),
    )
    logger.info({ prescriptionId }, 'BirdID: CMS embutido no placeholder PAdES com sucesso')
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
