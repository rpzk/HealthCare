import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MedicalCertificateService } from '@/lib/medical-certificate-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/certificates/[id]
 * Revoga atestado
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json(
        { error: 'Motivo da revogação é obrigatório' },
        { status: 400 }
      )
    }

    await MedicalCertificateService.revokeCertificate(
      params.id,
      session.user.id,
      reason
    )

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    logger.error('[Certificates] Erro ao revogar atestado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao revogar atestado' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/certificates/[id]
 * Obtém detalhes de um atestado
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true,
            birthDate: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            crmNumber: true,
            speciality: true
          }
        },
        consultation: {
          select: {
            id: true,
            scheduledDate: true
          }
        }
      }
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Atestado não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ certificate })

  } catch (error: unknown) {
    logger.error('[Certificates] Erro ao buscar atestado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar atestado' },
      { status: 500 }
    )
  }
}
