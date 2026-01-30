/**
 * PAdES Real Signer
 * 
 * Assinatura PAdES funcional com @signpdf/signpdf
 * Gera PDF assinado válido para validador ITI (validar.iti.gov.br)
 */

import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'
import fs from 'fs'
import { logger } from '@/lib/logger'

export interface PAdESSignResult {
  signedPdf: Buffer
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
 * Assina PDF com certificado A1 em formato PAdES
 * Retorna Buffer contendo PDF assinado com PKCS#7 embutido
 */
export async function signPdfWithA1PAdES(
  pdfBuffer: Buffer,
  pfxPath: string,
  pfxPassword: string,
  options?: {
    reason?: string
    location?: string
    contactInfo?: string
  }
): Promise<PAdESSignResult> {
  try {
    logger.info('[PAdES] Iniciando assinatura', {
      pdfSize: pdfBuffer.length,
      pfxPath: pfxPath.split('/').pop(),
    })

    // 1. Carregar certificado P12/PFX
    const p12Buffer = fs.readFileSync(pfxPath)

    // 2. Criar signer com @signpdf/signer-p12
    const signer = new P12Signer(p12Buffer, {
      passphrase: pfxPassword,
    })

    logger.info('[PAdES] Certificado carregado')

    // 3. Adicionar placeholder de assinatura no PDF
    let pdfWithPlaceholder: Buffer
    try {
      pdfWithPlaceholder = plainAddPlaceholder({
        pdfBuffer,
        reason: options?.reason || 'Documento assinado digitalmente',
        location: options?.location || 'Brasil',
        signatureLength: 4096, // Reduzido de 8192
        name: 'Signature1',
        contactInfo: options?.contactInfo || '',
      })
      logger.info('[PAdES] Placeholder adicionado com sucesso', {
        originalSize: pdfBuffer.length,
        withPlaceholder: pdfWithPlaceholder.length,
      })
    } catch (placeholderError) {
      logger.error('[PAdES] Erro ao adicionar placeholder:', placeholderError)
      throw new Error(`Failed to add signature placeholder: ${placeholderError instanceof Error ? placeholderError.message : String(placeholderError)}`)
    }

    // 4. Assinar PDF (isto gera PKCS#7 real e embeça no PDF)
    const signPdf = new SignPdf()
    const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer)

    logger.info('[PAdES] PDF assinado com sucesso', {
      signedSize: signedPdf.length,
      signatureAdded: signedPdf.length - pdfWithPlaceholder.length,
    })

    // 5. Extrair informações do certificado
    let certificateInfo = {
      subject: 'Certificado Assinado',
      issuer: 'Assinador A1',
      validFrom: new Date(),
      validTo: new Date(),
      serialNumber: 'N/A',
    }

    try {
      // Tentar extrair do P12 se possível
      const forge = await import('node-forge')
      const pfxBase64 = p12Buffer.toString('base64')
      const pfxAsn1 = forge.util.decode64(pfxBase64)
      const asn1 = forge.asn1.fromDer(pfxAsn1)
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPassword)

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
        forge.pki.oids.certBag
      ]

      if (certBags && certBags.length > 0 && certBags[0].cert) {
        const cert = certBags[0].cert
        certificateInfo = {
          subject:
            cert.subject.attributes
              .map((attr: any) => `${attr.shortName}=${attr.value}`)
              .join(', ') || 'Certificado Assinado',
          issuer:
            cert.issuer.attributes
              .map((attr: any) => `${attr.shortName}=${attr.value}`)
              .join(', ') || 'CA',
          validFrom: cert.validity.notBefore,
          validTo: cert.validity.notAfter,
          serialNumber: cert.serialNumber || 'N/A',
        }
      }
    } catch (extractError) {
      logger.warn('[PAdES] Não foi possível extrair info do certificado:', extractError)
    }

    return {
      signedPdf,
      certificateInfo,
      signedAt: new Date(),
    }
  } catch (error) {
    logger.error('[PAdES] Erro ao assinar PDF:', error)
    throw error
  }
}

/**
 * Verifica se um PDF contém assinatura
 */
export function isPdfSigned(pdfBuffer: Buffer): boolean {
  const pdfString = pdfBuffer.toString('binary')
  // Procura por estruturas de assinatura PDF
  return /\/Type\s*\/Sig|\/Contents\s*</.test(pdfString)
}
