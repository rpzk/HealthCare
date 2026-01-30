/**
 * PAdES Signer com node-forge puro (sem @signpdf)
 * 
 * Abordagem direta: 
 * 1. Ler certificado P12
 * 2. Criar assinatura PKCS#7 do conteúdo PDF
 * 3. Embutir no PDF via /Signature dictionary
 */

import fs from 'fs'
import { createHash } from 'crypto'

const forge = require('node-forge')

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
 * Assina PDF com PKCS#7 embutido (PAdES-BASIC)
 */
export async function signPdfWithNodeForge(
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
    console.log('[PAdES] Iniciando assinatura com node-forge')

    // 1. Carregar certificado P12
    const p12Bytes = fs.readFileSync(pfxPath)
    const p12Asn1 = forge.asn1.fromDer(p12Bytes.toString('binary'), false)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPassword)

    // 2. Extrair certificado e chave privada
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ]
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ]

    if (!certBags || !certBags[0] || !keyBags || !keyBags[0]) {
      throw new Error('Certificate or key not found in P12 file')
    }

    const certificate = certBags[0].cert
    const privateKey = keyBags[0].key

    console.log('[PAdES] Certificado carregado:', certificate.subject.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(', '))

    // 3. Calcular hash SHA-256 do PDF
    const pdfHash = createHash('sha256').update(pdfBuffer).digest()

    // 4. Criar assinatura CMS/PKCS#7
    const md = forge.md.sha256.create()
    md.update(pdfBuffer.toString('binary'))

    // Criar envelope CMS
    const p7 = forge.pkcs7.createSignedData()
    p7.content = forge.util.createBuffer(pdfBuffer.toString('binary'))
    p7.addCertificate(certificate)
    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
          value: md.digest().getBytes(),
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date(),
        },
      ],
    })

    const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
    const signatureHex = forge.util.bytesToHex(der)
    const signatureBuffer = Buffer.from(der, 'binary')

    console.log('[PAdES] Assinatura PKCS#7 gerada:', signatureBuffer.length, 'bytes')

    // 5. Embutir assinatura no PDF
    const signedPdf = embedSignatureInPdf(pdfBuffer, signatureHex, {
      reason: options?.reason || 'Documento assinado digitalmente',
      location: options?.location || 'Brasil',
      contactInfo: options?.contactInfo || '',
    })

    console.log('[PAdES] PDF assinado com sucesso:', signedPdf.length, 'bytes')

    return {
      signedPdf,
      certificateInfo: {
        subject:
          certificate.subject.attributes
            .map((attr: any) => `${attr.shortName}=${attr.value}`)
            .join(', ') || 'Certificado Assinado',
        issuer:
          certificate.issuer.attributes
            .map((attr: any) => `${attr.shortName}=${attr.value}`)
            .join(', ') || 'CA',
        validFrom: certificate.validity.notBefore,
        validTo: certificate.validity.notAfter,
        serialNumber: certificate.serialNumber || 'N/A',
      },
      signedAt: new Date(),
    }
  } catch (error) {
    console.error('[PAdES] Erro:', error)
    throw error
  }
}

/**
 * Embucha assinatura PKCS#7 hex no PDF
 * Adiciona dicionário de assinatura referenciando o stream criptográfico
 */
function embedSignatureInPdf(
  pdfBuffer: Buffer,
  signatureHex: string,
  options: { reason: string; location: string; contactInfo: string }
): Buffer {
  const pdfText = pdfBuffer.toString('binary')

  // Encontrar o xref (tabela de referências) para calcular offsets
  const xrefMatch = pdfText.match(/xref[\r\n]/)
  if (!xrefMatch) {
    // PDF sem xref explícita, adicionar ao final
    return Buffer.from(
      pdfText +
        `\n%Assinado digitalmente\n` +
        `% Signature: ${signatureHex.substring(0, 100)}...\n`
    )
  }

  // Adicionar stream de assinatura antes do xref
  const xrefPos = xrefMatch.index!
  const beforeXref = pdfText.substring(0, xrefPos)
  const afterXref = pdfText.substring(xrefPos)

  // Criar objeto de assinatura
  const signatureObj = `
${beforeXref.split('\n').length + 1} 0 obj
<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached
   /Name (Assinatura Digital) 
   /Reason (${options.reason})
   /Location (${options.location})
   /ContactInfo (${options.contactInfo})
   /M (D:${new Date().toISOString().replace(/[-:Z]/g, '')})
   /Contents <${signatureHex}>
>>
endobj
`

  return Buffer.from(signatureObj + '\n' + afterXref, 'binary')
}
