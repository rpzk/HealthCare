/**
 * Serviço de Assinatura Digital PAdES
 * 
 * Gera assinaturas PAdES-B válidas para validação no ITI (validar.iti.gov.br)
 * 
 * Conformidade:
 * - ICP-Brasil (Infraestrutura de Chaves Públicas Brasileira)
 * - CAdES-BES (CMS Advanced Electronic Signatures - Basic Electronic Signature)
 * - PAdES-B (PDF Advanced Electronic Signatures - Basic)
 * - ISO 32000-1 (PDF Reference)
 * 
 * IMPORTANTE:
 * - Requer certificado A1 (.pfx/.p12) válido emitido por AC credenciada ICP-Brasil
 * - O certificado deve conter a cadeia completa (AC Raiz → AC Intermediária → Certificado)
 */

import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import { PDFDocument, PDFName, PDFDict, PDFHexString, PDFString, PDFArray, PDFNumber } from 'pdf-lib'
import * as forge from 'node-forge'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { logger } from '@/lib/logger'

export interface PAdESSignatureResult {
  signedPdf: Buffer
  signature: {
    value: string           // Base64 da assinatura PKCS#7
    algorithm: string       // Ex: SHA256withRSA
    signedAt: Date
  }
  certificate: {
    subject: string         // CN do certificado
    issuer: string          // Emissor (AC)
    serial: string          // Número de série
    validFrom: Date
    validTo: Date
    cpf?: string            // CPF extraído do certificado ICP-Brasil
    name?: string           // Nome extraído do certificado ICP-Brasil
  }
  document: {
    hash: string            // SHA-256 do PDF original
    hashAlgorithm: string
  }
}

export interface SigningOptions {
  reason?: string           // Motivo da assinatura
  location?: string         // Local da assinatura
  contactInfo?: string      // Contato do assinante
  name?: string             // Nome do assinante
  includeTimestamp?: boolean // Incluir carimbo de tempo (TSA)
  timestampUrl?: string     // URL da TSA
}

const DEFAULT_SIGNING_OPTIONS: SigningOptions = {
  reason: 'Documento assinado digitalmente',
  location: 'Brasil',
  includeTimestamp: false,
}

/**
 * Extrai informações do certificado ICP-Brasil
 */
export function extractCertificateInfo(pfxBuffer: Buffer, password: string): PAdESSignatureResult['certificate'] {
  const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password)
  
  // Buscar certificado
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]
  if (!certBags || certBags.length === 0) {
    throw new Error('Certificado não encontrado no arquivo .pfx')
  }
  
  const cert = certBags[0].cert
  if (!cert) {
    throw new Error('Certificado inválido')
  }
  
  // Extrair subject
  const subjectAttrs = cert.subject.attributes.map((attr: any) => 
    `${attr.shortName || attr.name}=${attr.value}`
  ).join(', ')
  
  // Extrair issuer
  const issuerAttrs = cert.issuer.attributes.map((attr: any) => 
    `${attr.shortName || attr.name}=${attr.value}`
  ).join(', ')
  
  // Tentar extrair CPF e Nome do certificado ICP-Brasil
  // No ICP-Brasil, o CPF geralmente está no campo CN ou em extensões
  let cpf: string | undefined
  let name: string | undefined
  
  const cnAttr = cert.subject.getField('CN')
  if (cnAttr) {
    const cn = cnAttr.value as string
    // Formato típico ICP-Brasil: "NOME DO TITULAR:12345678901"
    const cpfMatch = cn.match(/:(\d{11})$/)
    if (cpfMatch) {
      cpf = cpfMatch[1]
      name = cn.replace(`:${cpf}`, '').trim()
    } else {
      name = cn
    }
  }
  
  return {
    subject: subjectAttrs,
    issuer: issuerAttrs,
    serial: cert.serialNumber,
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    cpf,
    name,
  }
}

/**
 * Valida se o certificado está válido e é ICP-Brasil
 */
export function validateCertificate(pfxBuffer: Buffer, password: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
  info?: PAdESSignatureResult['certificate']
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    const info = extractCertificateInfo(pfxBuffer, password)
    
    // Verificar validade
    const now = new Date()
    if (now < info.validFrom) {
      errors.push(`Certificado ainda não é válido. Válido a partir de: ${info.validFrom.toISOString()}`)
    }
    if (now > info.validTo) {
      errors.push(`Certificado expirado em: ${info.validTo.toISOString()}`)
    }
    
    // Verificar se é ICP-Brasil (verificar emissor)
    const knownICPBrasilCAs = [
      'AC SERASA', 'AC CERTISIGN', 'AC SOLUTI', 'AC VALID',
      'AC BOA VISTA', 'AC SAFEWEB', 'AC DIGITAL', 'AC LINK',
      'AC OAB', 'AC CAIXA', 'AC JUS', 'AC PR', 'AC CORREIOS',
      'SERASA', 'CERTISIGN', 'SOLUTI', 'VALID',
    ]
    
    const issuerUpper = info.issuer.toUpperCase()
    const isICPBrasil = knownICPBrasilCAs.some(ca => issuerUpper.includes(ca))
    
    if (!isICPBrasil) {
      warnings.push(`Certificado pode não ser ICP-Brasil. Emissor: ${info.issuer}`)
    }
    
    // Verificar se expira em breve (30 dias)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    if (info.validTo < thirtyDaysFromNow) {
      warnings.push(`Certificado expira em breve: ${info.validTo.toLocaleDateString('pt-BR')}`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    }
  } catch (error: any) {
    errors.push(`Erro ao processar certificado: ${error.message}`)
    return { valid: false, errors, warnings }
  }
}

/**
 * Adiciona placeholder de assinatura ao PDF usando pdf-lib
 * Esta é a abordagem mais confiável para criar PDFs com espaço para assinatura
 */
async function addSignaturePlaceholder(
  pdfBuffer: Buffer,
  options: SigningOptions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
  
  // Obter ou criar AcroForm
  const acroForm = pdfDoc.catalog.getOrCreateAcroForm()
  
  // Criar dicionário de assinatura
  const signatureDict = pdfDoc.context.obj({
    Type: PDFName.of('Sig'),
    Filter: PDFName.of('Adobe.PPKLite'),
    SubFilter: PDFName.of('adbe.pkcs7.detached'),
    ByteRange: PDFArray.withContext(pdfDoc.context),
    Contents: PDFHexString.of('0'.repeat(16384)), // Espaço para assinatura PKCS#7
    Reason: options.reason ? PDFString.of(options.reason) : undefined,
    Location: options.location ? PDFString.of(options.location) : undefined,
    M: PDFString.of(new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'),
    ContactInfo: options.contactInfo ? PDFString.of(options.contactInfo) : undefined,
  })
  
  // Registrar assinatura
  const signatureRef = pdfDoc.context.register(signatureDict)
  
  // Criar widget de assinatura (invisível)
  const widgetDict = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Sig'),
    Rect: [0, 0, 0, 0], // Assinatura invisível
    V: signatureRef,
    T: PDFString.of('Signature1'),
    F: 4, // Annotation flags
    P: pdfDoc.getPage(0).ref,
  })
  
  const widgetRef = pdfDoc.context.register(widgetDict)
  
  // Adicionar ao formulário
  acroForm.addField(widgetRef)
  
  // Adicionar à página
  const page = pdfDoc.getPage(0)
  const annots = page.node.get(PDFName.of('Annots'))
  if (annots instanceof PDFArray) {
    annots.push(widgetRef)
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]))
  }
  
  // Configurar flags do AcroForm
  acroForm.dict.set(PDFName.of('SigFlags'), PDFNumber.of(3)) // SignaturesExist | AppendOnly
  
  return Buffer.from(await pdfDoc.save({ useObjectStreams: false }))
}

/**
 * Assina PDF com certificado A1 usando @signpdf
 * Gera assinatura PAdES-B válida para ITI
 */
export async function signPdfWithPAdES(
  pdfBuffer: Buffer,
  pfxPath: string,
  pfxPassword: string,
  options: SigningOptions = {}
): Promise<PAdESSignatureResult> {
  const opts = { ...DEFAULT_SIGNING_OPTIONS, ...options }
  
  logger.info('[PAdES] Iniciando assinatura', {
    pdfSize: pdfBuffer.length,
    pfxPath: pfxPath.split('/').pop(),
  })
  
  // 1. Ler certificado
  const pfxBuffer = fs.readFileSync(pfxPath)
  
  // 2. Validar certificado
  const validation = validateCertificate(pfxBuffer, pfxPassword)
  if (!validation.valid) {
    throw new Error(`Certificado inválido: ${validation.errors.join('; ')}`)
  }
  
  // 3. Calcular hash do PDF original
  const originalHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
  
  // 4. Criar signer com @signpdf
  const signer = new P12Signer(pfxBuffer, { passphrase: pfxPassword })
  
  // 5. Adicionar placeholder usando plainAddPlaceholder do @signpdf
  const { plainAddPlaceholder } = await import('@signpdf/placeholder-plain')
  
  let pdfWithPlaceholder: Buffer
  try {
    pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: opts.reason || 'Documento assinado digitalmente',
      location: opts.location || 'Brasil',
      signatureLength: 16384, // Espaço suficiente para certificado + cadeia ICP-Brasil
      contactInfo: opts.contactInfo || '',
      name: opts.name || validation.info?.name || 'Assinante',
    })
    
    logger.info('[PAdES] Placeholder adicionado', {
      originalSize: pdfBuffer.length,
      withPlaceholder: pdfWithPlaceholder.length,
    })
  } catch (placeholderError: any) {
    logger.error('[PAdES] Erro ao adicionar placeholder:', placeholderError)
    throw new Error(`Falha ao preparar PDF para assinatura: ${placeholderError.message}`)
  }
  
  // 6. Assinar PDF
  const signPdf = new SignPdf()
  let signedPdf: Buffer
  
  try {
    signedPdf = await signPdf.sign(pdfWithPlaceholder, signer)
    
    logger.info('[PAdES] PDF assinado com sucesso', {
      signedSize: signedPdf.length,
    })
  } catch (signError: any) {
    logger.error('[PAdES] Erro ao assinar PDF:', signError)
    throw new Error(`Falha na assinatura digital: ${signError.message}`)
  }
  
  // 7. Extrair informações da assinatura para retorno
  const certInfo = validation.info!
  
  // 8. Extrair assinatura PKCS#7 do PDF assinado
  const signatureValue = extractPkcs7FromSignedPdf(signedPdf)
  
  return {
    signedPdf,
    signature: {
      value: signatureValue,
      algorithm: 'SHA256withRSA',
      signedAt: new Date(),
    },
    certificate: certInfo,
    document: {
      hash: originalHash,
      hashAlgorithm: 'SHA-256',
    },
  }
}

/**
 * Extrai a assinatura PKCS#7 de um PDF assinado
 */
function extractPkcs7FromSignedPdf(pdfBuffer: Buffer): string {
  const pdfString = pdfBuffer.toString('binary')
  
  // Procurar por /Contents <hex>
  const contentsMatch = pdfString.match(/\/Contents\s*<([0-9A-Fa-f]+)>/)
  if (contentsMatch && contentsMatch[1]) {
    // Remover zeros à direita (padding)
    const hexValue = contentsMatch[1].replace(/0+$/, '')
    // Converter hex para base64
    const buffer = Buffer.from(hexValue, 'hex')
    return buffer.toString('base64')
  }
  
  return ''
}

/**
 * Verifica se um PDF está assinado
 */
export function isPdfSigned(pdfBuffer: Buffer): boolean {
  const pdfString = pdfBuffer.toString('binary')
  return /\/Type\s*\/Sig/.test(pdfString) && /\/Contents\s*</.test(pdfString)
}

/**
 * Extrai informações da assinatura de um PDF assinado
 */
export async function getSignatureInfo(pdfBuffer: Buffer): Promise<{
  isSigned: boolean
  signatures: Array<{
    reason?: string
    location?: string
    date?: string
    name?: string
  }>
}> {
  const pdfString = pdfBuffer.toString('binary')
  
  if (!isPdfSigned(pdfBuffer)) {
    return { isSigned: false, signatures: [] }
  }
  
  const signatures: Array<{
    reason?: string
    location?: string
    date?: string
    name?: string
  }> = []
  
  // Extrair informações básicas usando regex
  const reasonMatch = pdfString.match(/\/Reason\s*\(([^)]+)\)/)
  const locationMatch = pdfString.match(/\/Location\s*\(([^)]+)\)/)
  const dateMatch = pdfString.match(/\/M\s*\(([^)]+)\)/)
  const nameMatch = pdfString.match(/\/Name\s*\(([^)]+)\)/)
  
  signatures.push({
    reason: reasonMatch?.[1],
    location: locationMatch?.[1],
    date: dateMatch?.[1],
    name: nameMatch?.[1],
  })
  
  return { isSigned: true, signatures }
}

/**
 * Assina PDF a partir do conteúdo do certificado (Buffer) em vez de path
 * Útil quando o certificado está em memória ou banco de dados
 */
export async function signPdfWithPAdESFromBuffer(
  pdfBuffer: Buffer,
  pfxBuffer: Buffer,
  pfxPassword: string,
  options: SigningOptions = {}
): Promise<PAdESSignatureResult> {
  const opts = { ...DEFAULT_SIGNING_OPTIONS, ...options }
  
  logger.info('[PAdES] Iniciando assinatura (buffer)', {
    pdfSize: pdfBuffer.length,
    pfxSize: pfxBuffer.length,
  })
  
  // 1. Validar certificado
  const validation = validateCertificate(pfxBuffer, pfxPassword)
  if (!validation.valid) {
    throw new Error(`Certificado inválido: ${validation.errors.join('; ')}`)
  }
  
  // 2. Calcular hash do PDF original
  const originalHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
  
  // 3. Criar signer
  const signer = new P12Signer(pfxBuffer, { passphrase: pfxPassword })
  
  // 4. Adicionar placeholder
  const { plainAddPlaceholder } = await import('@signpdf/placeholder-plain')
  
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: opts.reason || 'Documento assinado digitalmente',
    location: opts.location || 'Brasil',
    signatureLength: 16384,
    contactInfo: opts.contactInfo || '',
    name: validation.info?.name || 'Assinante',
  })
  
  // 5. Assinar
  const signPdf = new SignPdf()
  const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer)
  
  // 6. Extrair informações
  const certInfo = validation.info!
  const signatureValue = extractPkcs7FromSignedPdf(signedPdf)
  
  return {
    signedPdf,
    signature: {
      value: signatureValue,
      algorithm: 'SHA256withRSA',
      signedAt: new Date(),
    },
    certificate: certInfo,
    document: {
      hash: originalHash,
      hashAlgorithm: 'SHA-256',
    },
  }
}
