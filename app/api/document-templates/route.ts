/**
 * API: Listar, criar e gerenciar templates de documentos
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentTemplateService } from '@/lib/document-templates/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreateTemplateSchema = z.object({
  name: z.string().min(3).max(255),
  documentType: z.string().min(3),
  description: z.string().optional(),
  htmlTemplate: z.string().min(10),
  cssTemplate: z.string().optional(),
  config: z.record(z.any()).optional(),
  signaturePosition: z.string().optional(),
  signatureSize: z.string().optional(),
  qrcodePosition: z.string().optional(),
  qrcodeSize: z.string().optional(),
  showQrcode: z.boolean().optional(),
  clinicName: z.boolean().optional(),
  clinicLogo: z.boolean().optional(),
  clinicAddress: z.boolean().optional(),
  clinicPhone: z.boolean().optional(),
  doctorName: z.boolean().optional(),
  doctorSpec: z.boolean().optional(),
  doctorCRM: z.boolean().optional(),
  doctorAddress: z.boolean().optional(),
  doctorLogo: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  footerText: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parâmetros de query
    const { searchParams } = new URL(req.url)
    const documentType = searchParams.get('documentType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Listar templates
    const [templates, total] =
      await Promise.all([
        DocumentTemplateService.listTemplates(
          {
            documentType: documentType || undefined,
            isActive: true,
          },
          { skip, take: limit }
        ),
        DocumentTemplateService.countTemplates({
          isActive: true,
          documentType: documentType || undefined,
        }),
      ])

    return NextResponse.json({
      templates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar templates' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    // Validar role (admin, doctor)
    if (!session?.user || !['ADMIN', 'DOCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = CreateTemplateSchema.parse(body)

    const template = await DocumentTemplateService.createTemplate(
      validated,
      session.user.id
    )

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)

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
      { error: 'Erro ao criar template' },
      { status: 500 }
    )
  }
}
