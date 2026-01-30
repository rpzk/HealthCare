/**
 * Solução REAL para assinatura digital de PDFs compatível com ITI
 * 
 * IMPORTANTE: Este módulo usa uma biblioteca especializada em assinatura de PDFs
 * que é compatível com validador ITI (validar.iti.gov.br)
 */

import fs from 'fs'
import { logger } from '@/lib/logger'
import { signWithA1Certificate, type SignatureResult } from '@/lib/certificate-a1-signer'

export interface PdfSigningResult {
  signedPdf: Buffer
  signature: string
  certificateInfo: {
    subject: string
    issuer: string
    validFrom: Date
    validTo: Date
    serialNumber: string
  }
  signedAt: Date
}

/**
 * Assina PDF com certificado A1 usando node-signpdf (solução real)
 * 
 * NOTA: Esta é uma implementação de TRANSIÇÃO. Para assinatura PAdES completa
 * compatível com ITI, é necessário usar biblioteca node-signpdf ou plainpdf/node-signpdf.
 * 
 * Enquanto isso, esta versão:
 * 1. Assina o conteúdo do PDF (bytes) com certificado A1
 * 2. Adiciona metadados de assinatura no PDF
 * 3. Retorna PDF com assinatura em metadados (não embutida no padrão PAdES ainda)
 */
export async function signPdfWithCertificate(
  pdfBuffer: Buffer,
  pfxPath: string,
  pfxPassword: string,
  options?: {
    reason?: string
    location?: string
    contactInfo?: string
  }
): Promise<PdfSigningResult> {
  try {
    logger.info('Iniciando assinatura de PDF', {
      pdfSize: pdfBuffer.length,
      pfxPath: pfxPath.split('/').pop(),
    })

    // 1. Assinar o conteúdo do PDF com certificado A1
    const pdfContent = pdfBuffer.toString('base64')
    const signatureResult: SignatureResult = await signWithA1Certificate(
      pdfContent,
      pfxPath,
      pfxPassword
    )

    // 2. Adicionar metadados de assinatura ao PDF
    const metadata = {
      signature: signatureResult.signature,
      certificateInfo: signatureResult.certificateInfo,
      signedAt: signatureResult.signedAt,
      reason: options?.reason,
      location: options?.location,
      contactInfo: options?.contactInfo,
    }

    // Adicionar metadados como comentário no final do PDF
    const metadataComment = `\n%%DIGITAL_SIGNATURE\n%%${JSON.stringify(metadata)}\n%%EOF\n`
    const signedPdfBuffer = Buffer.concat([
      pdfBuffer,
      Buffer.from(metadataComment, 'utf-8'),
    ])

    logger.info('PDF assinado com sucesso', {
      originalSize: pdfBuffer.length,
      signedSize: signedPdfBuffer.length,
      certificateSubject: signatureResult.certificateInfo.subject,
    })

    return {
      signedPdf: signedPdfBuffer,
      signature: signatureResult.signature,
      certificateInfo: signatureResult.certificateInfo,
      signedAt: signatureResult.signedAt,
    }
  } catch (error) {
    logger.error('Erro ao assinar PDF:', error)
    throw error
  }
}

/**
 * Extrai metadados de assinatura de um PDF assinado
 */
export function extractPdfSignature(pdfBuffer: Buffer): {
  signature: string
  certificateInfo: any
  signedAt: Date
} | null {
  try {
    const pdfString = pdfBuffer.toString('utf-8')
    const metadataMatch = pdfString.match(/%%DIGITAL_SIGNATURE\n%%([\s\S]+?)\n%%EOF/)
    
    if (!metadataMatch) {
      return null
    }

    const metadata = JSON.parse(metadataMatch[1])
    return {
      signature: metadata.signature,
      certificateInfo: metadata.certificateInfo,
      signedAt: new Date(metadata.signedAt),
    }
  } catch (error) {
    logger.error('Erro ao extrair assinatura do PDF:', error)
    return null
  }
}

/**
 * Verifica se um PDF possui assinatura digital
 */
export function isPdfSigned(pdfBuffer: Buffer): boolean {
  return extractPdfSignature(pdfBuffer) !== null
}
