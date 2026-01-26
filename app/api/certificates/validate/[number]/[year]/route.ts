import { NextResponse } from 'next/server'
import { MedicalCertificateService } from '@/lib/medical-certificate-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/certificates/validate/[number]/[year]
 * Valida autenticidade de atestado via QR Code
 */
export async function GET(
  request: Request,
  { params }: { params: { number: string; year: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const hash = searchParams.get('h') ?? searchParams.get('hash')

    if (!hash) {
      return NextResponse.json(
        { error: 'Hash de validação não fornecido' },
        { status: 400 }
      )
    }

    const sequenceNumber = parseInt(params.number)
    const year = parseInt(params.year)

    if (isNaN(sequenceNumber) || isNaN(year)) {
      return NextResponse.json(
        { error: 'Número ou ano inválido' },
        { status: 400 }
      )
    }

    const result = await MedicalCertificateService.validateCertificate(
      sequenceNumber,
      year,
      hash
    )

    if (!result?.certificate) {
      return NextResponse.json(result)
    }

    const certificate = result.certificate

    // Public response: never expose CPF.
    const publicCertificate = {
      ...certificate,
      patient: {
        name: certificate.patient?.name,
        email: certificate.patient?.email,
      },
      doctor: {
        name: certificate.doctor?.name,
        specialty: certificate.doctor?.speciality,
        crmNumber: certificate.doctor?.crmNumber,
      },
    }

    return NextResponse.json({
      ...result,
      certificate: publicCertificate,
    })

  } catch (error: unknown) {
    logger.error('[Certificates] Erro ao validar atestado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao validar atestado' },
      { status: 500 }
    )
  }
}
