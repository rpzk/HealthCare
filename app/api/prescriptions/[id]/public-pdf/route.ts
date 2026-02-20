/**
 * GET /api/prescriptions/[id]/public-pdf
 *
 * Download público do PDF assinado da prescrição.
 * Não exige autenticação; usado pela página /validar/[id] (botão "Baixar PDF Original Assinado").
 * Só entrega o arquivo se a prescrição tiver SignedDocument e o PDF existir em disco.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = typeof params.id === 'string' ? params.id : params.id?.[0]
    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'PRESCRIPTION', documentId: id },
      orderBy: { signedAt: 'desc' },
      select: { signedAt: true },
    })

    if (!signed) {
      return NextResponse.json(
        { error: 'Documento não assinado. Apenas prescrições assinadas podem ser baixadas aqui.' },
        { status: 404 }
      )
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', 'prescription')
    const filepath = path.join(uploadsDir, `${id}.pdf`)

    let stat: Awaited<ReturnType<typeof fs.stat>>
    try {
      stat = await fs.stat(filepath)
    } catch {
      return NextResponse.json(
        { error: 'Arquivo PDF não encontrado no servidor.' },
        { status: 404 }
      )
    }

    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 404 })
    }

    const pdfBuffer = await fs.readFile(filepath)
    const filename = `receituario_assinado_${id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao obter o documento' }, { status: 500 })
  }
}
