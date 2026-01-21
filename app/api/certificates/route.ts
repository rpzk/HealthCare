import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MedicalCertificateService } from '@/lib/medical-certificate-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/certificates
 * Emite novo atestado médico
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validações básicas
    if (!body.patientId || !body.type || !body.startDate) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Se conteúdo não fornecido, gerar padrão
    let content = body.content
    if (!content) {
      // Buscar nome do paciente para gerar conteúdo padrão
      const patient = await prisma.patient.findUnique({
        where: { id: body.patientId },
        select: { name: true }
      })

      if (patient) {
        content = MedicalCertificateService.generateDefaultContent(
          body.type,
          patient.name,
          body.days,
          body.observations
        )
      }
    }

    const certificate = await MedicalCertificateService.issueCertificate({
      patientId: body.patientId,
      doctorId: session.user.id,
      consultationId: body.consultationId,
      type: body.type,
      days: body.days ? parseInt(body.days) : undefined,
      startDate: new Date(body.startDate),
      includeCid: body.includeCid,
      cidCode: body.cidCode,
      cidDescription: body.cidDescription,
      content,
      observations: body.observations,
      title: body.title
    })

    return NextResponse.json({
      success: true,
      certificate
    })

  } catch (error: unknown) {
    logger.error('[Certificates] Erro ao emitir atestado:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao emitir atestado' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/certificates
 * Lista atestados (do paciente ou do médico)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const doctorId = searchParams.get('doctorId')

    let certificates

    if (patientId) {
      certificates = await MedicalCertificateService.getPatientCertificates(patientId)
    } else if (doctorId) {
      certificates = await MedicalCertificateService.getDoctorCertificates(doctorId)
    } else {
      // Listar atestados do médico logado
      certificates = await MedicalCertificateService.getDoctorCertificates(session.user.id)
    }

    return NextResponse.json({ certificates })

  } catch (error: unknown) {
    logger.error('[Certificates] Erro ao listar atestados:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar atestados' },
      { status: 500 }
    )
  }
}
