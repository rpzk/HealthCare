/**
 * GET /api/prescriptions/[id]/print
 *
 * Serve o arquivo PDF assinado da prescrição para download direto.
 * Headers configurados para forçar download no navegador (attachment).
 * Se o PDF assinado não existir, retorna 404.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const id = typeof params.id === 'string' ? params.id : params.id?.[0]
    if (!id) {
      return NextResponse.json({ error: 'ID da prescrição é obrigatório' }, { status: 400 })
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: {
        id: true,
        doctorId: true,
        patient: { select: { userAccount: { select: { id: true } } } },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    const userId = session.user.id
    const userRole = session.user.role
    const isDoctor = prescription.doctorId === userId
    const isPatient = (prescription.patient as { userAccount?: { id: string } | null })?.userAccount?.id === userId
    const isAdmin = ['ADMIN', 'OWNER'].includes(userRole || '')
    if (!isDoctor && !isPatient && !isAdmin) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
    const filepath = path.join(uploadsDir, `${id}.pdf`)

    let stat: Awaited<ReturnType<typeof fs.stat>>
    try {
      stat = await fs.stat(filepath)
    } catch {
      logger.warn({ prescriptionId: id, filepath }, 'PDF assinado não encontrado para print')
      return NextResponse.json(
        { error: 'Documento PDF assinado não encontrado. Assine a prescrição antes de imprimir.' },
        { status: 404 }
      )
    }

    if (!stat.isFile()) {
      return NextResponse.json(
        { error: 'Documento PDF assinado não encontrado.' },
        { status: 404 }
      )
    }

    const pdfBuffer = await fs.readFile(filepath)
    const filename = `receituario_assinado_${id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao servir PDF de impressão')
    return NextResponse.json({ error: 'Erro interno ao obter o documento.' }, { status: 500 })
  }
}
