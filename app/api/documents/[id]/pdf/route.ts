/**
 * API para download do PDF de documento
 * 
 * @route GET /api/documents/[id]/pdf
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSignedDocument } from '@/lib/documents/service'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    
    const documentId = params.id
    
    // Buscar documento
    const result = await getSignedDocument(documentId, session.user.id)
    
    if (!result.success || !result.pdf) {
      return NextResponse.json(
        { error: result.error || 'Documento não encontrado' },
        { status: 404 }
      )
    }
    
    // Retornar PDF como Uint8Array para o NextResponse
    const pdfData = new Uint8Array(result.pdf)
    
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${result.fileName || `documento-${documentId}.pdf`}"`,
        'Content-Length': result.pdf.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    })
    
  } catch (error) {
    logger.error('Erro ao buscar PDF do documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
