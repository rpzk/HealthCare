/**
 * Assinatura com Certificado A1 (.pfx)
 *
 * Assina conteúdo textual usando o certificado A1 do usuário
 * e retorna a assinatura base64 + metadados do certificado.
 * Não faz PAdES, validação de cadeia ou TSA; para PAdES use um serviço ou
 * biblioteca dedicada e valide end-to-end antes de produção.
 */

import forge from 'node-forge'
import fs from 'fs'
import { logger } from '@/lib/logger'

export interface SignatureResult {
  signature: string
  certificateInfo: {
    subject: string
    issuer: string
    validFrom: Date
    validTo: Date
    serialNumber: string
  }
  signedAt: Date
  certificatePem?: string
}

/**
 * Assina documento com certificado A1 (sem TSA, sem validação de cadeia)
 */
export async function signWithA1Certificate(
  documentData: string,
  pfxPath: string,
  pfxPassword: string
): Promise<SignatureResult> {
  
  try {
    // 1. Ler arquivo .pfx
    const pfxBuffer = fs.readFileSync(pfxPath)
    const pfxBase64 = pfxBuffer.toString('base64')
    
    // 2. Decodificar com node-forge
    const pfxAsn1 = forge.util.decode64(pfxBase64)
    const asn1 = forge.asn1.fromDer(pfxAsn1)
    
    // 3. Extrair PKCS#12 com senha
    let p12
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPassword)
    } catch (err) {
      logger.error('Erro ao descriptografar .pfx com a senha fornecida:', err)
      throw new Error('Senha do certificado incorreta')
    }
    
    if (!p12) {
      logger.error('P12 retornou undefined - possível erro na senha ou arquivo corrompido')
      throw new Error('Erro ao processar certificado - arquivo pode estar corrompido ou senha incorreta')
    }
  
    // 4. Obter chave privada - tentar múltiplos tipos de bag
    let privateKey = null

    const tryBag = (bagType: string) => {
      try {
        const bags = p12.getBags({ bagType })[bagType]
        if (bags && bags.length > 0 && bags[0]?.key) {
          return bags[0].key
        }
      } catch {
        // ignore bag errors and continue
      }
      return null
    }

    privateKey =
      tryBag(forge.pki.oids.pkcs8ShroudedKeyBag) ||
      tryBag(forge.pki.oids.rsaPrivateKeyBag) ||
      tryBag(forge.pki.oids.keyBag)

    if (!privateKey) {
      throw new Error('Chave privada não encontrada no certificado (verifique a senha ou gere novo .pfx)')
    }
  
  // 5. Obter certificado
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ]
  
  if (!certBags || certBags.length === 0) {
    throw new Error('Certificado não encontrado')
  }
  
  const certificate = certBags[0].cert
  
  if (!certificate) {
    throw new Error('Certificado inválido')
  }
  
  // 6. Verificar validade
  const now = new Date()
  if (now < certificate.validity.notBefore || now > certificate.validity.notAfter) {
    throw new Error('Certificado expirado ou ainda não válido')
  }
  
  // 7. Criar hash SHA-256 do documento
  const md = forge.md.sha256.create()
  md.update(documentData, 'utf8')
  
  // 8. Assinar com chave privada
  const signature = privateKey.sign(md)
  
  // 9. Codificar assinatura em Base64
  const signatureBase64 = forge.util.encode64(signature)
  
  // 10. Extrair informações do certificado
  const subject = certificate.subject.attributes
    .map((attr: any) => `${attr.shortName}=${attr.value}`)
    .join(', ')
  
  const issuer = certificate.issuer.attributes
    .map((attr: any) => `${attr.shortName}=${attr.value}`)
    .join(', ')
  
  const certificatePem = forge.pki.certificateToPem(certificate)
  
  return {
    signature: signatureBase64,
    certificateInfo: {
      subject,
      issuer,
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
      serialNumber: certificate.serialNumber,
    },
    signedAt: new Date(),
    certificatePem,
  }
  } catch (error) {
    logger.error('Erro em signWithA1Certificate:', error)
    throw error
  }
}

/**
 * Verifica assinatura de documento
 */
export async function verifyA1Signature(
  documentData: string,
  signature: string,
  pfxPath: string,
  pfxPassword: string
): Promise<boolean> {
  try {
    // 1. Ler certificado
    const pfxBuffer = fs.readFileSync(pfxPath)
    const pfxBase64 = pfxBuffer.toString('base64')
    const pfxAsn1 = forge.util.decode64(pfxBase64)
    const asn1 = forge.asn1.fromDer(pfxAsn1)
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPassword)
    
    // 2. Obter certificado público
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ]
    
    if (!certBags || certBags.length === 0) {
      return false
    }
    
    const certificate = certBags[0].cert
    if (!certificate) {
      return false
    }
    
    const publicKey = certificate.publicKey
    
    // 3. Criar hash do documento
    const md = forge.md.sha256.create()
    md.update(documentData, 'utf8')
    
    // 4. Decodificar assinatura
    const signatureBytes = forge.util.decode64(signature)
    
    // 5. Verificar assinatura
    const verified = publicKey.verify(md.digest().bytes(), signatureBytes)
    
    return verified
  } catch (error) {
    logger.error('Erro ao verificar assinatura:', error)
    return false
  }
}

/**
 * Extrai informações do certificado sem assinar
 */
export function getCertificateInfo(pfxPath: string, pfxPassword: string) {
  const pfxBuffer = fs.readFileSync(pfxPath)
  const pfxBase64 = pfxBuffer.toString('base64')
  const pfxAsn1 = forge.util.decode64(pfxBase64)
  const asn1 = forge.asn1.fromDer(pfxAsn1)
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPassword)
  
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ]
  
  if (!certBags || certBags.length === 0) {
    throw new Error('Certificado não encontrado')
  }
  
  const certificate = certBags[0].cert
  if (!certificate) {
    throw new Error('Certificado inválido')
  }
  
  // Extrair nome do certificado (CN)
  const cnAttr = certificate.subject.attributes.find(
    (attr: any) => attr.shortName === 'CN'
  )
  
  // Extrair CPF do certificado (se existir no OID)
  let cpf = null
  const extensions = certificate.extensions || []
  
  return {
    name: cnAttr?.value ?? null,
    cpf,
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
    issuer: certificate.issuer.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(', '),
    serialNumber: certificate.serialNumber,
  }
}
