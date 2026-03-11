export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withDoctorAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { signPdfWithPAdES } from '@/lib/documents/pades-signer'
import { generateConsultationPrescriptionPdfBuffer } from '@/lib/prescription-pdf-helpers'
import { getCertificatePassword } from '@/lib/certificate-session'

export const runtime = 'nodejs'

/** Busca consulta com prescrições para PDF (mesmo pipeline da página de prescrições) */
async function fetchConsultationForPdf(consultationId: string) {
  return prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      patient: { select: { id: true, name: true, cpf: true, birthDate: true, phone: true } },
      doctor: {
        select: {
          id: true,
          name: true,
          crmNumber: true,
          licenseNumber: true,
          licenseState: true,
          speciality: true,
          email: true,
          person: { select: { cpf: true } },
        },
      },
      prescriptions: {
        where: { consultationId },
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            include: {
              medication: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
}

// GET: Gera PDF sem assinatura (mesmo layout CFM da página de prescrições)
export const GET = withDoctorAuth(async (req: NextRequest, { params, user }: { params: Record<string, string>; user: any }) => {
  try {
    const consultationId = params.id
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.APP_BASE_URL ||
      (req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : req.headers.get('host')
          ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`
          : '')

    const consultation = await fetchConsultationForPdf(consultationId)
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada.' },
        { status: 404 }
      )
    }
    if (consultation.prescriptions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma prescrição encontrada. Salve a consulta e gere os documentos antes de imprimir.' },
        { status: 404 }
      )
    }

    const useStamp = req.nextUrl.searchParams.get('stamp') === '1'
    const pdf = await generateConsultationPrescriptionPdfBuffer(consultation, baseUrl, consultationId, { useStamp })

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescricoes-${consultationId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao gerar PDF de prescrições da consulta')
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
        timestamp: new Date().toISOString(),
        success: false,
      },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler

// POST: Gera e assina PDF com PAdES (mesmo pipeline da página de prescrições)
export const POST = withDoctorAuth(async (req: NextRequest, { params, user }: { params: Record<string, string>; user: any }) => {
  try {
    const consultationId = params.id
    const body = await req.json().catch(() => ({}))
    let password = body?.password
    if (!password) {
      password = await getCertificatePassword(user.id)
    }
    if (!password) {
      return NextResponse.json(
        { error: 'Senha do certificado obrigatória ou ative a sessão de assinatura digital no menu superior' },
        { status: 400 }
      )
    }

    const cert = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, certificateType: 'A1', revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!cert || !cert.pfxFilePath) {
      return NextResponse.json({ error: 'Certificado digital A1 não encontrado para este usuário' }, { status: 404 })
    }

    const { resolveCertificatePath } = await import('@/lib/certificate-path')
    const certPath = await resolveCertificatePath(cert.pfxFilePath)
    if (!certPath) {
      return NextResponse.json({ error: 'Arquivo do certificado não encontrado. Reenvie o certificado em Configurações > Certificados Digitais.' }, { status: 404 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const consultation = await fetchConsultationForPdf(consultationId)
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada ou sem prescrições salvas.' },
        { status: 404 }
      )
    }
    if (consultation.prescriptions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma prescrição encontrada. Salve a consulta e gere os documentos antes de assinar.' },
        { status: 404 }
      )
    }

    // 1. Gera PDF (mesmo layout CFM da página de prescrições)
    const pdfBuffer = await generateConsultationPrescriptionPdfBuffer(consultation, baseUrl, consultationId)

    // 2. Assina com PAdES (mesmo fluxo de /api/prescriptions/[id]/sign)
    const signResult = await signPdfWithPAdES(
      pdfBuffer,
      certPath,
      password,
      {
        reason: 'Prescrição médica assinada digitalmente',
        location: 'Brasil',
        name: user.name || 'Médico',
      }
    )

    if (!signResult?.signedPdf) {
      return NextResponse.json({ error: 'Falha ao assinar o documento' }, { status: 500 })
    }

    const verificationUrl = `${baseUrl}/api/consultations/${consultationId}/documents/prescriptions/pdf/verify`

    return new NextResponse(new Uint8Array(signResult.signedPdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescricoes-${consultationId}.pdf"`,
        'X-Verification-Url': verificationUrl,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    logger.error({ error, consultationId: params?.id, userId: user?.id }, 'Erro ao assinar PDF de prescrições da consulta')
    const msg = error instanceof Error ? error.message : 'Erro ao assinar PDF'
    if (typeof msg === 'string' && msg.toLowerCase().includes('password')) {
      return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
    }
    return NextResponse.json(
      { error: msg, timestamp: new Date().toISOString(), success: false },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
