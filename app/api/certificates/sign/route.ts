/**
 * API Route: Assinar atestado com certificado ICP-Brasil (A1)
 * POST /api/certificates/sign
 * Compat wrapper para fluxo novo baseado em A1 por usuário.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'


interface SignCertificateRequest {
  certificateId?: string
  html?: string
  pdfBuffer?: string // base64
  css?: string
  filename?: string
  password?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const userRole = session?.user?.role as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const body = (await request.json()) as SignCertificateRequest
    // Se vier HTML ou PDF direto
    if (body.html || body.pdfBuffer) {
      let pdf: Buffer
      if (body.html) {
        pdf = await signPdfWithGotenberg({ html: body.html, customCss: body.css, filename: body.filename })
      } else if (body.pdfBuffer) {
        pdf = await signPdfWithGotenberg({ pdfBuffer: Buffer.from(body.pdfBuffer, 'base64'), filename: body.filename })
      } else {
        return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
      }
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${body.filename || 'certificado-assinado.pdf'}"`,
        },
      })
    }
    // Se vier certificateId, busca dados e gera HTML, exige senha e valida certificado digital do médico
    if (body.certificateId) {
      const { password } = body
      if (!password) {
        return NextResponse.json({ error: 'Senha do certificado obrigatória' }, { status: 400 })
      }
      const certificate = await prisma.medicalCertificate.findUnique({
        where: { id: body.certificateId },
        include: { patient: true, doctor: true }
      })
      if (!certificate) {
        return NextResponse.json({ error: 'Atestado não encontrado' }, { status: 404 })
      }
      if (certificate.doctorId !== userId && userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Não tem permissão para assinar este atestado' }, { status: 403 })
      }
      // Busca certificado digital A1 do médico
      const cert = await prisma.digitalCertificate.findFirst({
        where: { userId: certificate.doctorId, isActive: true, certificateType: 'A1', revokedAt: null },
        orderBy: { createdAt: 'desc' },
      })
      if (!cert || !cert.pfxFilePath) {
        return NextResponse.json({ error: 'Certificado digital A1 não encontrado para este usuário' }, { status: 404 })
      }
      // Valida senha (hash)
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
      if (cert.pfxPasswordHash !== passwordHash) {
        return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
      }
      // Gera HTML real do atestado
      const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Atestado</title></head><body><h1>ATESTADO MÉDICO</h1><p><b>Paciente:</b> ${certificate.patient.name}</p><p><b>Médico:</b> ${certificate.doctor.name}</p><p><b>Conteúdo:</b> ${certificate.content}</p><p><b>Data:</b> ${certificate.createdAt.toLocaleDateString('pt-BR')}</p></body></html>`
      const pdf = await signPdfWithGotenberg({
        html,
        filename: `atestado-${certificate.id}.pdf`,
        certPath: cert.pfxFilePath,
        certPassword: password,
      })
      // Calcula hash do conteúdo assinado
      const contentToSign = JSON.stringify({
        id: certificate.id,
        patientId: certificate.patientId,
        doctorId: certificate.doctorId,
        type: certificate.type,
        days: certificate.days,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        content: certificate.content,
        createdAt: certificate.createdAt,
      })
      const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex')
      // Registra trilha de auditoria
      await prisma.signedDocument.create({
        data: {
          documentType: 'MEDICAL_CERTIFICATE',
          documentId: certificate.id,
          certificateId: cert.id,
          signerId: userId,
          signatureAlgorithm: 'PAdES',
          signatureValue: '', // Pode ser preenchido com valor real se disponível
          signatureHash,
          isValid: true,
          validatedAt: new Date(),
        },
      })
      // Gera verificationUrl
      const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
      const verificationUrl = `${baseUrl}/api/certificates/verify/${certificate.id}/${certificate.createdAt.getFullYear()}`
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="atestado-${certificate.id}.pdf"`,
          'X-Verification-Url': verificationUrl,
        },
      })
    }
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  } catch (error) {
    logger.error('[ICP-Brasil] Erro ao assinar:', error)
    return NextResponse.json({
      error: 'Falha ao assinar certificado',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
