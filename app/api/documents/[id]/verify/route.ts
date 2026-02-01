/**
 * API para Verificar Assinatura de Documento
 * 
 * @route GET /api/documents/[id]/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDocument, getSignedDocument } from '@/lib/documents/service'
import { isPdfSigned, getSignatureInfo } from '@/lib/documents/pades-signer'
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
    
    // Esta rota é pública para permitir verificação externa
    const doc = await prisma.signedDocument.findFirst({
      where: { documentId: id },
    })
    
    // Buscar nome do assinante separadamente
    let signerName = 'Desconhecido'
    if (doc) {
      const signer = await prisma.user.findUnique({
        where: { id: doc.signerId },
        select: { name: true },
      })
      if (signer?.name) {
        signerName = signer.name
      }
    }
    
    if (!doc) {
      return NextResponse.json({
        valid: false,
        error: 'Documento não encontrado',
        documentId: id,
      })
    }
    
    // Verificar documento
    const verification = await verifyDocument(id)
    
    // Obter informações adicionais da assinatura
    const pdfResult = await getSignedDocument(id)
    let signatureDetails = null
    
    if (pdfResult.success && pdfResult.pdf) {
      const isSigned = await isPdfSigned(pdfResult.pdf)
      if (isSigned) {
        try {
          signatureDetails = await getSignatureInfo(pdfResult.pdf)
        } catch (e) {
          // Pode falhar se a assinatura não puder ser extraída
          logger.warn('Não foi possível extrair detalhes da assinatura:', e)
        }
      }
    }
    
    return NextResponse.json({
      valid: verification.valid,
      documentId: id,
      documentType: doc.documentType,
      issueDate: doc.signedAt,
      signer: {
        name: signerName,
        cpf: undefined,
      },
      signature: verification.valid ? {
        algorithm: doc.signatureAlgorithm || 'PAdES-B',
        signedAt: doc.signedAt,
        integrityValid: true,
        details: signatureDetails,
      } : null,
      integrity: {
        fileHash: doc.signatureHash,
        hashAlgorithm: 'SHA-256',
        hashValid: verification.valid,
      },
      compliance: {
        cfm: 'CFM 2.299/2021',
        icpBrasil: true,
        validationUrl: 'https://validar.iti.gov.br',
      },
      error: verification.error,
    })
    
  } catch (error) {
    logger.error('Erro ao verificar documento:', error)
    return NextResponse.json({
      valid: false,
      error: 'Erro ao verificar documento',
    })
  }
}
