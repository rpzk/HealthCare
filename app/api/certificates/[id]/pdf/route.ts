import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCertificatePdf } from '@/lib/pdf-generator';
import { getBranding } from '@/lib/branding-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || '';
  const validationUrl = cert.qrCodeData
    ? `${baseUrl}/certificates/validate/${cert.sequenceNumber}/${cert.year}`
    : undefined;

  const branding = await getBranding();

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
    patient: { name: cert.patient?.name || 'Paciente' },
    doctor: { name: cert.doctor?.name || 'Médico', crm: cert.doctor?.crmNumber || undefined },
    validationUrl,
  });

  // Audit log for PDF generation
  try {
    await prisma.auditLog.create({
      data: {
        action: 'CERTIFICATE_PDF_GENERATED',
        resourceType: 'MedicalCertificate',
        resourceId: cert.id,
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
    console.warn('AuditLog failed for certificate PDF generation', e);
  }

  return new Response(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="atestado_${cert.sequenceNumber}_${cert.year}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
