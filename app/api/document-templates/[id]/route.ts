/**
 * API: Detalhe, atualizar e deletar template
 */

import { auth } from '@/auth'
import { DocumentTemplateService } from '@/lib/document-templates/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateTemplateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  htmlTemplate: z.string().min(10).optional(),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const template = await DocumentTemplateService.getTemplate(id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar se template existe e se é do mesmo usuário (ou admin)
    const template = await DocumentTemplateService.getTemplate(id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    if (
      template.createdBy !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = UpdateTemplateSchema.parse(body)

    const updated = await DocumentTemplateService.updateTemplate(
      { id, ...validated },
      session.user.id
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating template:', error)

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
      { error: 'Erro ao atualizar template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar permissão
    const template = await DocumentTemplateService.getTemplate(id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    if (
      template.createdBy !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await DocumentTemplateService.deleteTemplate(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar template' },
      { status: 500 }
    )
  }
}
