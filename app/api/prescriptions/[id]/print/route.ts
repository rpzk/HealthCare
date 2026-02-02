import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET /api/prescriptions/[id]/print - Returns HTML ready for printing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true, cpf: true }
        },
        doctor: {
          select: { id: true, name: true, speciality: true, crmNumber: true }
        },
        items: true
      }
    })

    if (!prescription) {
      return new NextResponse('Prescrição não encontrada', { status: 404 })
    }

    // Get signature info
    const signedDoc = await prisma.signedDocument.findFirst({
      where: { documentType: 'PRESCRIPTION', documentId: id },
      orderBy: { signedAt: 'desc' },
      include: {
        certificate: {
          select: {
            subject: true,
            issuer: true,
            serialNumber: true,
            notBefore: true,
            notAfter: true
          }
        }
      }
    })

    // Get clinic settings
    let clinicName = 'Clínica Médica'
    let clinicAddress = ''
    let clinicPhone = ''
    try {
      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['clinic_name', 'clinic_address', 'clinic_phone'] } }
      })
      for (const s of settings) {
        if (s.key === 'clinic_name') clinicName = s.value
        if (s.key === 'clinic_address') clinicAddress = s.value
        if (s.key === 'clinic_phone') clinicPhone = s.value
      }
    } catch {}

    // Parse medications - handle different formats
    let medications: Array<{
      name: string
      dosage: string
      frequency: string
      duration: string
      instructions?: string
    }> = []

    // Check if prescription has items (PrescriptionItem[])
    if (prescription.items && prescription.items.length > 0) {
      medications = prescription.items.map((item) => ({
        name: (item as any).medication?.name || (item as any).customName || (item as any).medication || (item as any).name || '',
        dosage: item.dosage || '',
        frequency: item.frequency || '',
        duration: item.duration || '',
        instructions: item.instructions ?? undefined
      }))
    } 
    // Check if prescription.medications is set (JSON field)
    else if ((prescription as any).medications) {
      const meds = (prescription as any).medications
      if (Array.isArray(meds)) {
        medications = meds
      } else if (typeof meds === 'object') {
        medications = [meds]
      }
    }
    // Fallback to single medication fields on prescription itself
    else if (prescription.medication) {
      medications = [{
        name: prescription.medication,
        dosage: prescription.dosage || '',
        frequency: prescription.frequency || '',
        duration: prescription.duration || '',
        instructions: prescription.instructions ?? undefined
      }]
    }

    // If no medications found, show message instead of error
    if (medications.length === 0) {
      medications = [{ name: 'Nenhum medicamento registrado', dosage: '', frequency: '', duration: '' }]
    }

    const formatDateTime = (date: Date) => {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      })
    }

    const baseUrl = request.headers.get('x-forwarded-host') 
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
        : ''
    
    const verificationUrl = signedDoc?.signatureHash 
      ? `${baseUrl}/api/digital-signatures/validate/${signedDoc.signatureHash}`
      : ''

    const qrCodeUrl = verificationUrl 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`
      : ''

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receituário - ${prescription.patient.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11px; 
      line-height: 1.4;
      padding: 15mm;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #000; 
      padding-bottom: 10px; 
      margin-bottom: 15px; 
    }
    .header h1 { font-size: 18px; margin-bottom: 3px; }
    .header p { font-size: 10px; color: #333; }
    .patient-box {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 8px 12px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .patient-box p { margin: 2px 0; }
    .medications { margin-bottom: 20px; }
    .medication {
      border-bottom: 1px solid #eee;
      padding: 8px 0;
    }
    .medication:last-child { border-bottom: none; }
    .medication .name { font-weight: bold; font-size: 12px; }
    .medication .details { font-size: 10px; color: #444; margin-top: 2px; }
    .notes {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 10px;
    }
    .signature-section {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .signature-left { flex: 1; }
    .signature-line {
      width: 200px;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 30px;
    }
    .signature-line p { font-size: 11px; }
    .digital-signature {
      background: #ecfdf5;
      border: 1px solid #10b981;
      padding: 8px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 9px;
      max-width: 280px;
    }
    .digital-signature .title {
      font-weight: bold;
      color: #047857;
      font-size: 10px;
      margin-bottom: 4px;
    }
    .digital-signature p { color: #065f46; margin: 1px 0; }
    .qr-section {
      text-align: center;
      margin-left: 20px;
    }
    .qr-section img {
      border: 2px solid #000;
      padding: 3px;
      background: white;
    }
    .qr-section p {
      font-size: 8px;
      color: #666;
      margin-top: 5px;
      max-width: 130px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 8px;
      color: #666;
      text-align: center;
    }
    .footer p { margin: 2px 0; }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${prescription.doctor.name}</h1>
    <p>CRM: ${prescription.doctor.crmNumber || 'N/A'}${prescription.doctor.speciality ? ` - ${prescription.doctor.speciality}` : ''}</p>
    <p>${clinicName}${clinicAddress ? ` | ${clinicAddress}` : ''}${clinicPhone ? ` | Tel: ${clinicPhone}` : ''}</p>
  </div>

  <div class="patient-box">
    <p><strong>Nome:</strong> ${prescription.patient.name}</p>
    ${prescription.patient.cpf ? `<p><strong>CPF:</strong> ${prescription.patient.cpf}</p>` : ''}
  </div>

  <div class="medications">
    ${medications.map((m, i) => `
      <div class="medication">
        <div class="name">${i + 1}. ${m.name}</div>
        <div class="details">
          ${m.dosage ? `Dosagem: ${m.dosage}` : ''}
          ${m.frequency ? ` | ${m.frequency}` : ''}
          ${m.duration ? ` | Duração: ${m.duration}` : ''}
        </div>
        ${m.instructions ? `<div class="details" style="font-style: italic; margin-top: 3px;">${m.instructions}</div>` : ''}
      </div>
    `).join('')}
  </div>

  ${(prescription as any).notes ? `
    <div class="notes">
      <strong>Observações:</strong> ${(prescription as any).notes}
    </div>
  ` : ''}

  <div class="signature-section">
    <div class="signature-left">
      <p><strong>Data e hora:</strong> ${formatDateTime(signedDoc?.signedAt || prescription.createdAt)}</p>
      
      <div class="signature-line">
        <p><strong>${prescription.doctor.name}</strong></p>
        <p>CRM ${prescription.doctor.crmNumber || 'N/A'}</p>
      </div>

      ${signedDoc ? `
        <div class="digital-signature">
          <div class="title">✓ Documento Assinado Digitalmente</div>
          <p><strong>Assinado por:</strong> ${signedDoc.certificate?.subject || prescription.doctor.name}</p>
          <p><strong>Em:</strong> ${formatDateTime(signedDoc.signedAt)}</p>
          ${signedDoc.certificate?.issuer ? `<p><strong>Emissor:</strong> ${signedDoc.certificate.issuer}</p>` : ''}
          ${signedDoc.certificate?.serialNumber ? `<p><strong>Nº Série:</strong> ${signedDoc.certificate.serialNumber}</p>` : ''}
        </div>
      ` : ''}
    </div>

    ${signedDoc && qrCodeUrl ? `
      <div class="qr-section">
        <img src="${qrCodeUrl}" alt="QR Code" width="120" height="120" />
        <p>Escaneie para validar a assinatura digital</p>
      </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Para validar este documento: ${verificationUrl || `${baseUrl}/api/digital-signatures/validate`}</p>
    <p>ID: ${prescription.id}${signedDoc?.signatureHash ? ` | Hash: ${signedDoc.signatureHash.slice(0, 20)}...` : ''}</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao gerar HTML de impressão')
    return new NextResponse('Erro interno', { status: 500 })
  }
}
