export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getCertificatePassword } from '@/lib/certificate-session'
import { resolveCertificatePath } from '@/lib/certificate-path'
import { signPdfWithA1PAdES } from '@/lib/pades-signer'
import { generateCertificatePdf } from '@/lib/pdf-generator'
import { getClinicDataForDocuments } from '@/lib/branding-service'
import { decrypt } from '@/lib/crypto'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/certificates/[id]/sign
 *
 * Gera o PDF do atestado e assina com PAdES usando o certificado A1 do médico.
 * A senha pode vir do body ou de uma sessão de certificado ativa.
 */
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // 1. Carregar atestado
    const cert = await prisma.medicalCertificate.findUnique({
      where: { id: String(id) },
      include: {
        patient: { select: { id: true, name: true, cpf: true } },
        doctor: {
          select: {
            id: true,
            name: true,
            crmNumber: true,
            speciality: true,
            licenseNumber: true,
            licenseType: true,
            licenseState: true,
          },
        },
      },
    })

    if (!cert) {
      return NextResponse.json({ error: 'Atestado não encontrado' }, { status: 404 })
    }

    // 2. Apenas o médico autor pode assinar
    if (cert.doctorId !== user.id) {
      return NextResponse.json(
        { error: 'Apenas o médico autor do atestado pode assiná-lo com seu certificado digital.' },
        { status: 403 }
      )
    }

    // 3. Verificar se já foi assinado
    const alreadySigned = await prisma.signedDocument.findFirst({
      where: { documentType: 'MEDICAL_CERTIFICATE', documentId: String(id) },
    })
    if (alreadySigned) {
      return NextResponse.json({ error: 'Atestado já foi assinado digitalmente.' }, { status: 400 })
    }

    // 4. Carregar certificado A1 ativo do médico
    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId: user.id, isActive: true, notAfter: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })

    if (!userCertificate?.pfxFilePath) {
      return NextResponse.json(
        { error: 'Certificado digital A1 não configurado. Configure em Configurações > Certificados Digitais.' },
        { status: 400 }
      )
    }

    const certPath = await resolveCertificatePath(userCertificate.pfxFilePath)
    if (!certPath) {
      return NextResponse.json(
        { error: 'Arquivo do certificado não encontrado. Reenvie em Configurações > Certificados Digitais.' },
        { status: 404 }
      )
    }

    // 5. Senha: body ou sessão ativa
    const body = await request.json().catch(() => ({})) as { password?: string }
    const password = body.password || (await getCertificatePassword(user.id))

    if (!password) {
      return NextResponse.json(
        { error: 'Senha do certificado obrigatória. Digite a senha ou ative a sessão de assinatura no menu superior.' },
        { status: 400 }
      )
    }

    // 6. Montar dados do PDF
    const clinicData = await getClinicDataForDocuments()
    const addrParts = [clinicData.clinicAddress, clinicData.clinicCity, clinicData.clinicState].filter(Boolean)
    const clinicAddress = addrParts.length
      ? addrParts.join(', ') + (clinicData.clinicZipCode ? ` - CEP ${clinicData.clinicZipCode}` : '')
      : undefined

    let rawCpf: string | null = null
    try {
      rawCpf = cert.patient?.cpf ? decrypt(cert.patient.cpf) : null
    } catch {
      rawCpf = cert.patient?.cpf || null
    }

    const formatCpf = (cpf?: string | null) => {
      if (!cpf) return undefined
      const digits = cpf.replace(/\D/g, '')
      if (digits.length !== 11) return cpf
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    const doctorRegistration = cert.doctor?.crmNumber
      ? `CRM: ${cert.doctor.crmNumber}`
      : cert.doctor?.licenseNumber
        ? `${cert.doctor.licenseType || 'Registro'}: ${cert.doctor.licenseNumber}${cert.doctor.licenseState ? `-${cert.doctor.licenseState}` : ''}`
        : undefined

    // URL de validação usando número sequencial (hash ainda não existe)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || ''
    const validationUrl = `${baseUrl}/certificates/validate/${cert.sequenceNumber}/${cert.year}`

    // 7. Gerar PDF
    const pdfBuffer = await generateCertificatePdf({
      clinic: {
        name: clinicData.clinicName || process.env.CLINIC_NAME || 'Clínica',
        address: clinicAddress,
        phone: clinicData.clinicPhone || undefined,
        logoUrl: clinicData.logoUrl || undefined,
        headerUrl: clinicData.headerUrl || undefined,
        footerText: clinicData.footerText || undefined,
      },
      certificate: {
        number: cert.sequenceNumber.toString().padStart(3, '0'),
        year: cert.year,
        type: cert.type,
        content: cert.content,
        startDate: new Date(cert.startDate).toLocaleDateString('pt-BR'),
        endDate: cert.endDate ? new Date(cert.endDate).toLocaleDateString('pt-BR') : undefined,
        hash: '',
        revoked: !!cert.revokedAt,
      },
      patient: { name: cert.patient?.name || 'Paciente', identifier: formatCpf(rawCpf) },
      doctor: { name: cert.doctor?.name || 'Médico', crm: doctorRegistration },
      validationUrl,
    })

    // 8. Assinar PDF com PAdES
    let signResult
    try {
      signResult = await signPdfWithA1PAdES(pdfBuffer, certPath, password, {
        reason: `Atestado Médico Nº ${cert.sequenceNumber}/${cert.year}`,
        location: 'Brasil',
        contactInfo: user.email || '',
      })
    } catch (sigError: any) {
      logger.error('[Atestado Sign] Falha na assinatura PAdES:', {
        error: sigError?.message,
        certId: id,
        userId: user.id,
      })
      const msg = sigError?.message?.toLowerCase() ?? ''
      if (msg.includes('password') || msg.includes('passphrase') || msg.includes('mac verify')) {
        return NextResponse.json({ error: 'Senha do certificado incorreta.' }, { status: 401 })
      }
      if (msg.includes('expired') || msg.includes('expirado')) {
        return NextResponse.json({ error: 'Certificado digital expirado.' }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Falha ao assinar documento. Verifique seu certificado e tente novamente.' },
        { status: 500 }
      )
    }

    // 9. Salvar PDF assinado
    const signedFilename = `atestado-${cert.sequenceNumber}-${cert.year}-${Date.now()}.pdf`
    const certDir = path.join(process.cwd(), 'public', 'certificates')
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })
    fs.writeFileSync(path.join(certDir, signedFilename), signResult.signedPdf)

    // 10. Hash do PDF assinado (para validação por conteúdo)
    const pdfHash = crypto.createHash('sha256').update(signResult.signedPdf).digest('hex')
    const hashValidationUrl = `${baseUrl}/certificates/validate/${pdfHash}`

    // 11. Atualizar registro do atestado
    await prisma.medicalCertificate.update({
      where: { id: String(id) },
      data: {
        pdfPath: `/certificates/${signedFilename}`,
        pdfHash,
        qrCodeData: hashValidationUrl,
        signature: signResult.certificateInfo.subject,
        signatureMethod: 'ICP_BRASIL',
        certificateChain: JSON.stringify({
          issuer: signResult.certificateInfo.issuer,
          serialNumber: signResult.certificateInfo.serialNumber,
          validFrom: signResult.certificateInfo.validFrom,
          validTo: signResult.certificateInfo.validTo,
        }),
        timestamp: signResult.signedAt,
      },
    })

    // 12. Trilha de auditoria
    const signatureHash = crypto.createHash('sha256').update(pdfHash).digest('hex')
    await prisma.signedDocument.create({
      data: {
        documentType: 'MEDICAL_CERTIFICATE',
        documentId: String(id),
        certificateId: userCertificate.id,
        signerId: user.id,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: signResult.certificateInfo.subject,
        signatureHash,
        isValid: true,
        validatedAt: new Date(),
      },
    })

    // 13. Atualizar estatísticas do certificado
    await prisma.digitalCertificate.update({
      where: { id: userCertificate.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    })

    logger.info('[Atestado Sign] Assinado com sucesso', {
      certId: id,
      userId: user.id,
      pdfHash,
    })

    return NextResponse.json({
      success: true,
      signedAt: signResult.signedAt,
      pdfPath: `/certificates/${signedFilename}`,
      pdfHash,
      validationUrl: hashValidationUrl,
      verificationPageUrl: `/verify/${signatureHash}`,
      certificate: {
        subject: signResult.certificateInfo.subject,
        issuer: signResult.certificateInfo.issuer,
        validFrom: signResult.certificateInfo.validFrom,
        validTo: signResult.certificateInfo.validTo,
        serialNumber: signResult.certificateInfo.serialNumber,
      },
    })
  } catch (error) {
    logger.error('[Atestado Sign] Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno ao assinar atestado.' }, { status: 500 })
  }
})
