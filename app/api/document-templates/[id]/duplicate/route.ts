/**
 * API: Duplicar template
 * POST /api/document-templates/[id]/duplicate
 */

import { auth } from '@/auth'
import { DocumentTemplateService } from '@/lib/document-templates/service'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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
    const newTemplate = await DocumentTemplateService.duplicateTemplate(
      id,
      session.user.id
    )

    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    logger.error('Error duplicating template:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Erro ao duplicar template' },
      { status: 500 }
    )
  }
}
