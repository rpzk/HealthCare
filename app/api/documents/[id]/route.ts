/**
 * API para Obter Documento por ID
 * 
 * @route GET /api/documents/[id]
 * @route GET /api/documents/[id]?format=pdf
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedDocument, verifyDocument } from '@/lib/documents/service'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    
    // Verificar documento
    const doc = await prisma.signedDocument.findFirst({
      where: { documentId: id },
      include: {
        signer: { select: { name: true } },
      },
    })
    
    if (!doc) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar formato solicitado
    const format = req.nextUrl.searchParams.get('format')
    
    if (format === 'pdf') {
      // Retornar PDF
      const pdfResult = await getSignedDocument(id)
      
      if (!pdfResult.success || !pdfResult.pdf) {
        return NextResponse.json(
          { error: 'Arquivo PDF não encontrado' },
          { status: 404 }
        )
      }
      
      return new NextResponse(new Uint8Array(pdfResult.pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${doc.documentType.toLowerCase()}-${id}.pdf"`,
          'Content-Length': pdfResult.pdf.length.toString(),
        },
      })
    }
    
    // Retornar metadados
    const verification = await verifyDocument(id)
    
    return NextResponse.json({
      id: doc.id,
      documentId: doc.documentId,
      documentType: doc.documentType,
      signedAt: doc.signedAt,
      signerName: doc.signer?.name || 'Desconhecido',
      signatureValid: verification.valid,
      signatureHash: doc.signatureHash,
      verificationUrl: `${process.env.NEXTAUTH_URL || ''}/verify/${doc.documentType.toLowerCase()}/${id}`,
    })
    
  } catch (error) {
    logger.error('Erro ao obter documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
