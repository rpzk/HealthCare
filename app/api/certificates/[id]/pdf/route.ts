import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificatePdf } from '@/lib/pdf-generator';
import { getBranding } from '@/lib/branding-service';
import { getCurrentUser } from '@/lib/with-auth';
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req)
    const shouldStamp = req.nextUrl.searchParams.get('stamp') === '1'
    
    const id = params.id;
    const cert = await prisma.medicalCertificate.findUnique({
      where: { id },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (!cert) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }


  // Garante que qrCodeData está preenchido e consistente
  let qrCodeData = cert.qrCodeData;
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || '';
  // Usa hash do PDF se disponível, senão fallback para número/ano
  let validationUrl = undefined;
  if (cert.pdfHash) {
    validationUrl = `${baseUrl}/certificates/validate/${cert.pdfHash}`;
    if (!qrCodeData || qrCodeData !== validationUrl) {
      // Atualiza no banco se necessário
      await prisma.medicalCertificate.update({
        where: { id },
        data: { qrCodeData: validationUrl },
      });
      qrCodeData = validationUrl;
    }
  } else {
    // fallback legacy
    validationUrl = `${baseUrl}/certificates/validate/${cert.sequenceNumber}/${cert.year}`;
    if (!qrCodeData || qrCodeData !== validationUrl) {
      await prisma.medicalCertificate.update({
        where: { id },
        data: { qrCodeData: validationUrl },
      });
      qrCodeData = validationUrl;
    }
  }

  // Só passa validationUrl se assinado
  const isSigned = !!cert.signature || !!cert.digitalSignature;
  const pdfValidationUrl = isSigned ? qrCodeData : undefined;

  const branding = await getBranding();

  const formatCpf = (cpf?: string | null) => {
    if (!cpf) return undefined
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const rawCpf = cert.patient?.cpf ? decrypt(cert.patient.cpf) : null
  const cpfFormatted = formatCpf(rawCpf || cert.patient?.cpf || null)

  const doctorRegistration = cert.doctor?.crmNumber
    ? `CRM: ${cert.doctor.crmNumber}`
    : cert.doctor?.licenseNumber
      ? `${cert.doctor.licenseType || 'Registro'}: ${cert.doctor.licenseNumber}${cert.doctor.licenseState ? `-${cert.doctor.licenseState}` : ''}`
      : undefined

  const buffer = await generateCertificatePdf({
    clinic: {
      name: branding?.clinicName || process.env.CLINIC_NAME || 'Clínica',
      address: undefined,
      phone: undefined,
      logoUrl: branding?.logoUrl || undefined,
      headerUrl: branding?.headerUrl || undefined,
      footerText: branding?.footerText || undefined,
    },
    certificate: {
      number: cert.sequenceNumber.toString().padStart(3, '0'),
      year: cert.year,
      type: cert.type,
      content: cert.content,
      startDate: new Date(cert.startDate).toLocaleDateString('pt-BR'),
      endDate: cert.endDate ? new Date(cert.endDate).toLocaleDateString('pt-BR') : undefined,
      hash: cert.pdfHash || '',
      signature: cert.signature || undefined,
      signatureMethod: cert.signatureMethod || undefined,
      revoked: !!cert.revokedAt,
    },
    patient: { name: cert.patient?.name || 'Paciente', identifier: cpfFormatted },
    doctor: { name: cert.doctor?.name || 'Médico', crm: doctorRegistration },
    validationUrl: pdfValidationUrl,
    stamp: shouldStamp,
  });

  // Audit log for PDF generation
  try {
    await prisma.auditLog.create({
      data: {
        action: 'CERTIFICATE_PDF_GENERATED',
        resourceType: 'MedicalCertificate',
        resourceId: cert.id,
        userId: user?.id || 'system',
        userEmail: user?.email || 'system',
        userRole: user?.role || 'SYSTEM',
        metadata: {
          sequenceNumber: cert.sequenceNumber,
          year: cert.year,
          doctorId: cert.doctorId,
          patientId: cert.patientId,
        },
      },
    });
  } catch (e) {
    // Non-blocking: PDF still returns even if audit fails
    logger.warn('AuditLog failed for certificate PDF generation', e);
  }

  return new Response(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="atestado_${cert.sequenceNumber}_${cert.year}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
  } catch (error) {
    logger.error('Error generating PDF:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), { status: 500 })
  }
}
