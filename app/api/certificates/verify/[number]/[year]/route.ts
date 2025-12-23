import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCertificate } from '@/lib/signature-service'

export const dynamic = 'force-dynamic'

/**
 * Validate certificate signature (public endpoint)
 * GET /api/certificates/verify/{number}/{year}?signature=...
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { number: string; year: string } }
) {
  const sequenceNumber = parseInt(params.number, 10)
  const year = parseInt(params.year, 10)
  const signatureParam = req.nextUrl.searchParams.get('signature')

  if (!sequenceNumber || !year) {
    return Response.json(
      { error: 'Invalid certificate number or year' },
      { status: 400 }
    )
  }

  const cert = await prisma.medicalCertificate.findFirst({
    where: { sequenceNumber, year },
    include: {
      doctor: true,
      patient: true,
    },
  })

  if (!cert) {
    return Response.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // If no signature on cert or no sig param provided, return unsigned status
  if (!cert.signature || !signatureParam) {
    return Response.json({
      valid: false,
      signed: false,
      message: 'Certificate is not signed',
      certificate: {
        number: cert.sequenceNumber,
        year: cert.year,
        status: cert.revokedAt ? 'REVOKED' : 'ACTIVE',
      },
    })
  }

  // Prepare data for verification (same format as signing)
  const certificateDataToSign = JSON.stringify({
    sequenceNumber: cert.sequenceNumber,
    year: cert.year,
    patientId: cert.patientId,
    doctorId: cert.doctorId,
    type: cert.type,
    startDate: cert.startDate.toISOString(),
    endDate: cert.endDate?.toISOString() || null,
    content: cert.content,
  })

  // Verify signature
  const result = verifyCertificate(
    certificateDataToSign,
    signatureParam,
    cert.signatureMethod as 'PKI_LOCAL' | 'ICP_BRASIL' | 'NONE'
  )

  return Response.json({
    valid: result.valid && !cert.revokedAt,
    signed: true,
    method: result.method,
    message: result.message,
    revoked: !!cert.revokedAt,
    revokedReason: cert.revokedReason || undefined,
    certificate: {
      number: cert.sequenceNumber,
      year: cert.year,
      type: cert.type,
      issuedAt: cert.issuedAt,
      revokedAt: cert.revokedAt,
      doctor: cert.doctor?.name,
      doctorCRM: cert.doctor?.crmNumber,
      patient: {
        name: cert.patient?.name,
        // Don't expose CPF in public API
      },
    },
  })
}
