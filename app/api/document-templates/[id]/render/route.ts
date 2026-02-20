/**
 * API: Renderizar template com dados do documento
 * POST /api/document-templates/[id]/render
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentTemplateService } from '@/lib/document-templates/service'
import {
  renderTemplate,
  TemplateDataContext,
  validateContext,
} from '@/lib/document-templates/renderer'
import { getBranding } from '@/lib/branding-service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const RenderRequestSchema = z.object({
  documentType: z.string(),
  documentId: z.string(),
  doctorId: z.string(),
  patientId: z.string().optional(),
  qrcodeUrl: z.string().optional(),
  customData: z.record(z.any()).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const validated = RenderRequestSchema.parse(body)

    // Obter template
    const template = await DocumentTemplateService.getTemplate(id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Obter dados de clínica
    const branding = await getBranding()

    // Obter dados do médico
    const doctor = await prisma.user.findUnique({
      where: { id: validated.doctorId },
    })

    if (!doctor) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      )
    }

    // Obter dados do paciente (se fornecido)
    let patient = null
    if (validated.patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      })
    }

    // Preparar contexto de dados (sem endereço do médico já que Person foi removido)
    const doctorAddress = null

    const context: TemplateDataContext = {
      clinic: {
        name: branding?.clinicName ?? undefined,
        address: branding?.clinicAddress ?? undefined,
        city: branding?.clinicCity ?? undefined,
        state: branding?.clinicState ?? undefined,
        zipCode: branding?.clinicZipCode ?? undefined,
        phone: branding?.clinicPhone ?? undefined,
        logoUrl: branding?.logoUrl ?? undefined,
        headerUrl: branding?.headerUrl ?? undefined,
        footerText: branding?.footerText ?? undefined,
      },
      doctor: {
        name: doctor.name,
        speciality: doctor.speciality || undefined,
        crmNumber: doctor.crmNumber || undefined,
        licenseType: doctor.licenseType || undefined,
        licenseState: doctor.licenseState || undefined,
        phone: doctor.phone || undefined,
        email: doctor.email || undefined,
        address: undefined, // Person model removed - use branding or custom data
        city: undefined,
        state: undefined,
        zipCode: undefined,
      },
      patient: patient
        ? {
            name: patient.name,
            email: patient.email,
            phone: patient.phone ?? undefined,
            cpf: patient.cpf || undefined,
            birthDate: patient.birthDate,
            gender: patient.gender ? String(patient.gender) : undefined,
            // Patient.address is now a single text field
            address: patient.address ?? undefined,
            city: undefined,
            state: undefined,
            zipCode: undefined,
          }
        : undefined,
      document: {
        date: new Date(),
        number: validated.documentId,
        type: validated.documentType,
        qrcodeUrl: validated.qrcodeUrl,
      },
      ...validated.customData,
    }

    // Validar contexto
    const validation = validateContext(context)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Dados incompletos para renderizar template',
          missing: validation.missing,
        },
        { status: 400 }
      )
    }

    // Renderizar template
    const html = renderTemplate(template.htmlTemplate, context)

    // Combinar com CSS
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    
    /* CSS do template */
    ${template.cssTemplate || ''}
    
    /* CSS padrão */
    .clinic-logo, .doctor-logo {
      max-height: 60px;
      max-width: 200px;
    }
    
    .clinic-header {
      width: 100%;
      max-height: 80px;
    }
    
    .document-qrcode {
      width: ${template.qrcodeSize || '2cm'};
      height: ${template.qrcodeSize || '2cm'};
    }
    
    .signature-line {
      border-top: 1px solid #000;
      width: 200px;
      display: inline-block;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `.trim()

    return NextResponse.json({
      html: fullHtml,
      context,
      template: {
        id: template.id,
        name: template.name,
        documentType: template.documentType,
      },
    })
  } catch (error) {
    logger.error('Error rendering template:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Erro ao renderizar template' },
      { status: 500 }
    )
  }
}
