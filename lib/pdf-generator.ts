import PDFDocument from 'pdfkit'
import path from 'path'
import { generateCertificateQRCode } from './qrcode-generator';

export type CertificatePdfInput = {
  clinic: { name: string; address?: string; phone?: string; logoUrl?: string; headerUrl?: string; footerText?: string };
  certificate: {
    number: string;
    year: number;
    type: string;
    content: string;
    startDate: string;
    endDate?: string;
    hash: string;
    signature?: string;
    signatureMethod?: string;
    revoked?: boolean;
  };
  patient: { name: string; identifier?: string };
  doctor: { name: string; crm?: string };
  validationUrl?: string;
};

export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];  
  // Generate QR code if validation URL provided
  let qrBuffer: Buffer | null = null
  if (input.validationUrl) {
    try {
      qrBuffer = await generateCertificateQRCode(input.validationUrl)
    } catch (e) {
      console.warn('Failed to generate QR code:', e)
    }
  }
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (d: any) => chunks.push(Buffer.from(d)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Header (logo or header image if available)
    if (input.clinic.logoUrl) {
      try {
        doc.image(pathFromPublic(input.clinic.logoUrl), 50, 40, { fit: [100, 50] });
      } catch {}
    }
    if (input.clinic.headerUrl) {
      try {
        doc.image(pathFromPublic(input.clinic.headerUrl), 200, 30, { fit: [340, 60] });
      } catch {}
    }
    doc.moveDown(input.clinic.logoUrl || input.clinic.headerUrl ? 2 : 0);
    doc.fontSize(18).text(input.clinic.name, { align: 'center' });
    if (input.clinic.address || input.clinic.phone) {
      doc.moveDown(0.2);
      doc
        .fontSize(10)
        .text(
          [input.clinic.address, input.clinic.phone].filter(Boolean).join(' • '),
          { align: 'center' }
        );
    }
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Title + identifiers
    doc.fontSize(16).text('ATESTADO MÉDICO', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Nº ${input.certificate.number}/${input.certificate.year}`, { align: 'center' });
    doc.moveDown(1);

    // Patient and doctor
    doc.fontSize(12).text(`Paciente: ${input.patient.name}`);
    if (input.patient.identifier) doc.fontSize(10).text(`ID: ${input.patient.identifier}`);
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Médico: ${input.doctor.name}`);
    if (input.doctor.crm) doc.fontSize(10).text(`CRM: ${input.doctor.crm}`);
    doc.moveDown(1);

    // Dates and type
    doc.fontSize(12).text(`Tipo: ${input.certificate.type}`);
    doc.fontSize(12).text(`Início: ${input.certificate.startDate}`);
    if (input.certificate.endDate) doc.fontSize(12).text(`Fim: ${input.certificate.endDate}`);
    doc.moveDown(1);

    // Content
    doc.fontSize(12).text('Conteúdo:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).text(input.certificate.content, { align: 'justify' });
    doc.moveDown(1);

    // Hash and validation with QR code
    doc.fontSize(10).text(`Hash: ${input.certificate.hash}`);
    if (input.certificate.signature) {
      doc.fontSize(10).text(`Assinatura Digital: ${input.certificate.signature.substring(0, 32)}...`);
      if (input.certificate.signatureMethod) {
        doc.fontSize(9).fillColor('gray').text(`Método: ${input.certificate.signatureMethod}`);
        doc.fillColor('black');
      }
    }
    
    // QR Code for validation (right side)
    if (qrBuffer) {
      try {
        doc.image(qrBuffer, 450, doc.y - 80, { width: 80, height: 80 });
        doc.moveDown(3);
      } catch (e) {
        console.warn('Failed to render QR code in PDF:', e);
      }
    }
    
    if (input.validationUrl) {
      doc
        .fontSize(10)
        .fillColor('blue')
        .text(`Validar em: ${input.validationUrl}`, { link: input.validationUrl, underline: true });
      doc.fillColor('black');
    }
    if (input.certificate.revoked) {
      doc.moveDown(0.5);
      doc.fillColor('red').fontSize(12).text('STATUS: REVOGADO');
      doc.fillColor('black');
    }

    // Footer text
    if (input.clinic.footerText) {
      doc.moveDown(2)
      doc.fontSize(10).fillColor('gray').text(input.clinic.footerText, { align: 'center' })
      doc.fillColor('black')
    }

    // Signature area
    doc.moveDown(2);
    doc.text('______________________________', { align: 'center' });
    doc.text(`Assinatura do Médico`, { align: 'center' });

    doc.end();
  });
}

function pathFromPublic(urlPath: string): string {
  if (!urlPath) return ''
  // Convert '/uploads/foo.png' to absolute filesystem path
  if (urlPath.startsWith('/')) {
    return path.join(process.cwd(), 'public', urlPath.replace(/^\//, ''))
  }
  return urlPath
}
