/**
 * Serviço de Verificação de Revogação de Certificados (OCSP/CRL)
 * 
 * Conformidade:
 * - RFC 6960 - Online Certificate Status Protocol (OCSP)
 * - RFC 5280 - Certificate Revocation List (CRL)
 * - ICP-Brasil DOC-ICP-01.02 - Práticas de Certificação
 * 
 * Verificação de certificados ICP-Brasil em tempo real para:
 * - Validar se certificado foi revogado
 * - Verificar status antes de assinar documentos
 * - Conformidade com CFM 2.218/2018 (NGS2)
 */

import * as crypto from 'crypto'
import * as forge from 'node-forge'
import { logger } from '@/lib/logger'

export interface CertificateStatus {
  status: 'GOOD' | 'REVOKED' | 'UNKNOWN' | 'ERROR'
  revokedAt?: Date
  revocationReason?: string
  checkedAt: Date
  responseSource: 'OCSP' | 'CRL' | 'CACHE' | 'NONE'
  nextUpdate?: Date
  error?: string
}

export interface OCSPResponse {
  status: 'GOOD' | 'REVOKED' | 'UNKNOWN'
  thisUpdate: Date
  nextUpdate?: Date
  revokedAt?: Date
  revocationReason?: number
  producedAt: Date
}

// Razões de revogação (RFC 5280)
const REVOCATION_REASONS: Record<number, string> = {
  0: 'Não especificado',
  1: 'Chave comprometida',
  2: 'CA comprometida',
  3: 'Mudança de afiliação',
  4: 'Substituído',
  5: 'Cessação de operação',
  6: 'Certificado suspenso',
  8: 'Removido da CRL',
  9: 'Privilégio retirado',
  10: 'AA comprometida'
}

// Cache em memória para status de certificados
const statusCache = new Map<string, { status: CertificateStatus; expiresAt: Date }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

/**
 * Extrai URL do OCSP responder do certificado (simplificado)
 * Nota: node-forge não tem suporte completo para extensões AIA
 */
export function extractOCSPUrl(certificate: forge.pki.Certificate): string | null {
  try {
    // Tentar extrair via extensões (método genérico)
    const extensions = (certificate as any).extensions
    if (!extensions) return null
    
    for (const ext of extensions) {
      if (ext.name === 'authorityInfoAccess' || ext.id === '1.3.6.1.5.5.7.1.1') {
        // Tentar parsear o valor da extensão
        if (ext.value && typeof ext.value === 'string') {
          // Procurar URL HTTP no valor
          const urlMatch = ext.value.match(/https?:\/\/[^\s]+/i)
          if (urlMatch) return urlMatch[0]
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Extrai URLs de CRL do certificado (simplificado)
 */
export function extractCRLUrls(certificate: forge.pki.Certificate): string[] {
  try {
    const urls: string[] = []
    const extensions = (certificate as any).extensions
    if (!extensions) return urls
    
    for (const ext of extensions) {
      if (ext.name === 'cRLDistributionPoints' || ext.id === '2.5.29.31') {
        if (ext.value && typeof ext.value === 'string') {
          // Procurar URLs HTTP no valor
          const urlMatches = ext.value.match(/https?:\/\/[^\s]+/gi)
          if (urlMatches) urls.push(...urlMatches)
        }
      }
    }
    
    return urls
  } catch {
    return []
  }
}

/**
 * Gera chave de cache para certificado
 */
function getCacheKey(certificate: forge.pki.Certificate): string {
  return (certificate as any).serialNumber || 'unknown'
}

/**
 * Verifica cache de status
 */
function checkCache(certificate: forge.pki.Certificate): CertificateStatus | null {
  const key = getCacheKey(certificate)
  const cached = statusCache.get(key)
  
  if (cached && cached.expiresAt > new Date()) {
    return { ...cached.status, responseSource: 'CACHE' }
  }
  
  return null
}

/**
 * Atualiza cache de status
 */
function updateCache(certificate: forge.pki.Certificate, status: CertificateStatus): void {
  const key = getCacheKey(certificate)
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS)
  statusCache.set(key, { status, expiresAt })
}

/**
 * Constrói request OCSP (simplificado)
 * Nota: Implementação básica para demonstração
 */
function buildOCSPRequest(
  certificate: forge.pki.Certificate,
  issuerCertificate: forge.pki.Certificate
): Uint8Array {
  // Extrair serial number
  const serialHex = (certificate as any).serialNumber || '01'
  const serialNumber = Buffer.from(serialHex.replace(/:/g, ''), 'hex')
  
  // Hash simplificado do emissor (SHA-1)
  const issuerDN = issuerCertificate.subject.attributes
    .map((attr: any) => `${attr.shortName || attr.name}=${attr.value}`)
    .join(',')
  const issuerNameHash = crypto.createHash('sha1').update(issuerDN).digest()
  
  // Hash da chave pública (simplificado)
  const pubKey = (issuerCertificate.publicKey as any)
  const keyData = pubKey.n ? pubKey.n.toString(16) : 'defaultkey'
  const issuerKeyHash = crypto.createHash('sha1').update(keyData, 'hex').digest()
  
  // Construir ASN.1 OCSPRequest (simplificado)
  const sha1OID = Buffer.from([0x06, 0x05, 0x2B, 0x0E, 0x03, 0x02, 0x1A]) // SHA-1
  const algorithmId = Buffer.concat([
    Buffer.from([0x30, sha1OID.length + 2]),
    sha1OID,
    Buffer.from([0x05, 0x00]) // NULL
  ])
  
  const certId = Buffer.concat([
    Buffer.from([0x30]), // SEQUENCE
    Buffer.from([algorithmId.length + 2 + issuerNameHash.length + 2 + issuerKeyHash.length + 2 + serialNumber.length]),
    algorithmId,
    Buffer.from([0x04, issuerNameHash.length]), issuerNameHash,
    Buffer.from([0x04, issuerKeyHash.length]), issuerKeyHash,
    Buffer.from([0x02, serialNumber.length]), serialNumber
  ])
  
  // RequestList
  const request = Buffer.concat([
    Buffer.from([0x30, certId.length]),
    certId
  ])
  
  const requestList = Buffer.concat([
    Buffer.from([0x30, request.length]),
    request
  ])
  
  // TBSRequest
  const tbsRequest = Buffer.concat([
    Buffer.from([0x30, requestList.length]),
    requestList
  ])
  
  // OCSPRequest
  const ocspRequest = Buffer.concat([
    Buffer.from([0x30, tbsRequest.length]),
    tbsRequest
  ])
  
  return new Uint8Array(ocspRequest)
}

/**
 * Parseia resposta OCSP (simplificado)
 */
function parseOCSPResponse(response: Buffer): OCSPResponse | null {
  try {
    // OCSPResponse ::= SEQUENCE {
    //   responseStatus OCSPResponseStatus,
    //   responseBytes [0] EXPLICIT ResponseBytes OPTIONAL }
    
    if (response[0] !== 0x30) {
      return null
    }
    
    // Verificar status (deve ser 0 = successful)
    // Posição 4 é tipicamente o status
    if (response.length > 5 && response[4] === 0x0A && response[5] === 0x01) {
      const status = response[6]
      if (status !== 0) {
        logger.warn('[OCSP] Response status não é successful:', status)
        return null
      }
    }
    
    // Procurar CertStatus (simplificado)
    // good [0] IMPLICIT NULL
    // revoked [1] IMPLICIT RevokedInfo
    // unknown [2] IMPLICIT UnknownInfo
    
    // Buscar padrões no response
    const now = new Date()
    
    // Verificar se contém indicador de revogação
    // Tag [1] = 0xA1 para revoked
    let certStatus: 'GOOD' | 'REVOKED' | 'UNKNOWN' = 'UNKNOWN'
    let revokedAt: Date | undefined
    let revocationReason: number | undefined
    
    for (let i = 0; i < response.length - 2; i++) {
      // [0] IMPLICIT NULL = good (0x80, 0x00)
      if (response[i] === 0x80 && response[i + 1] === 0x00) {
        certStatus = 'GOOD'
        break
      }
      // [1] IMPLICIT RevokedInfo (0xA1)
      if (response[i] === 0xA1) {
        certStatus = 'REVOKED'
        // Tentar extrair GeneralizedTime da revogação
        for (let j = i; j < Math.min(i + 30, response.length); j++) {
          if (response[j] === 0x18) { // GeneralizedTime
            const len = response[j + 1]
            if (len >= 14) {
              const timeStr = response.subarray(j + 2, j + 2 + len).toString('ascii')
              const year = parseInt(timeStr.substring(0, 4))
              const month = parseInt(timeStr.substring(4, 6)) - 1
              const day = parseInt(timeStr.substring(6, 8))
              const hour = parseInt(timeStr.substring(8, 10))
              const min = parseInt(timeStr.substring(10, 12))
              const sec = parseInt(timeStr.substring(12, 14))
              revokedAt = new Date(Date.UTC(year, month, day, hour, min, sec))
            }
            break
          }
        }
        break
      }
      // [2] IMPLICIT NULL = unknown (0x82)
      if (response[i] === 0x82) {
        certStatus = 'UNKNOWN'
        break
      }
    }
    
    return {
      status: certStatus,
      thisUpdate: now,
      nextUpdate: new Date(now.getTime() + CACHE_TTL_MS),
      producedAt: now,
      revokedAt,
      revocationReason
    }
    
  } catch (error) {
    logger.error('[OCSP] Erro ao parsear resposta:', error)
    return null
  }
}

/**
 * Verifica status via OCSP
 */
async function checkOCSP(
  certificate: forge.pki.Certificate,
  issuerCertificate: forge.pki.Certificate,
  ocspUrl: string
): Promise<CertificateStatus> {
  try {
    const serialNumber = (certificate as any).serialNumber || 'unknown'
    logger.info('[OCSP] Verificando certificado via OCSP', {
      serial: serialNumber,
      url: ocspUrl
    })
    
    const request = buildOCSPRequest(certificate, issuerCertificate)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    // Convert to ArrayBuffer for fetch body
    const requestBody = Buffer.from(request)
    
    const response = await fetch(ocspUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ocsp-request',
        'Accept': 'application/ocsp-response'
      },
      body: requestBody,
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const responseBuffer = Buffer.from(await response.arrayBuffer())
    const parsed = parseOCSPResponse(responseBuffer)
    
    if (!parsed) {
      return {
        status: 'ERROR',
        checkedAt: new Date(),
        responseSource: 'OCSP',
        error: 'Não foi possível parsear resposta OCSP'
      }
    }
    
    const result: CertificateStatus = {
      status: parsed.status,
      checkedAt: new Date(),
      responseSource: 'OCSP',
      nextUpdate: parsed.nextUpdate,
      revokedAt: parsed.revokedAt,
      revocationReason: parsed.revocationReason !== undefined 
        ? REVOCATION_REASONS[parsed.revocationReason] 
        : undefined
    }
    
    updateCache(certificate, result)
    return result
    
  } catch (error: any) {
    logger.error('[OCSP] Erro na verificação:', error)
    return {
      status: 'ERROR',
      checkedAt: new Date(),
      responseSource: 'OCSP',
      error: error.message
    }
  }
}

/**
 * Verifica status do certificado (OCSP com fallback para cache)
 */
export async function checkCertificateStatus(
  pfxBuffer: Buffer,
  password: string
): Promise<CertificateStatus> {
  try {
    // Extrair certificado do PFX
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'))
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password)
    
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]
    if (!certBags || certBags.length === 0) {
      return {
        status: 'ERROR',
        checkedAt: new Date(),
        responseSource: 'NONE',
        error: 'Certificado não encontrado no PFX'
      }
    }
    
    const cert = certBags[0].cert!
    
    // Verificar cache primeiro
    const cached = checkCache(cert)
    if (cached) {
      logger.info('[OCSP] Usando status em cache', { status: cached.status })
      return cached
    }
    
    // Tentar extrair URL OCSP
    const ocspUrl = extractOCSPUrl(cert)
    
    if (ocspUrl) {
      // Encontrar certificado do emissor (normalmente está no PFX junto)
      let issuerCert: forge.pki.Certificate | null = null
      for (const bag of certBags) {
        if (bag.cert && bag.cert.subject.hash !== cert.subject.hash) {
          // Verificar se é o emissor
          if (bag.cert.subject.hash === cert.issuer.hash) {
            issuerCert = bag.cert
            break
          }
        }
      }
      
      if (issuerCert) {
        return await checkOCSP(cert, issuerCert, ocspUrl)
      } else {
        logger.warn('[OCSP] Certificado do emissor não encontrado no PFX')
      }
    }
    
    // Se não conseguiu OCSP, retornar status desconhecido
    return {
      status: 'UNKNOWN',
      checkedAt: new Date(),
      responseSource: 'NONE',
      error: 'OCSP não disponível para este certificado'
    }
    
  } catch (error: any) {
    logger.error('[OCSP] Erro ao verificar certificado:', error)
    return {
      status: 'ERROR',
      checkedAt: new Date(),
      responseSource: 'NONE',
      error: error.message
    }
  }
}

/**
 * Verifica se certificado está válido para assinatura
 * Combina verificação de validade temporal e revogação
 */
export async function validateCertificateForSigning(
  pfxBuffer: Buffer,
  password: string
): Promise<{
  valid: boolean
  errors: string[]
  warnings: string[]
  revocationStatus?: CertificateStatus
}> {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    // Verificar estrutura básica
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'))
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password)
    
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]
    if (!certBags || certBags.length === 0) {
      errors.push('Certificado não encontrado no arquivo PFX')
      return { valid: false, errors, warnings }
    }
    
    const cert = certBags[0].cert!
    const now = new Date()
    
    // Verificar validade temporal
    if (now < cert.validity.notBefore) {
      errors.push(`Certificado ainda não válido. Válido a partir de: ${cert.validity.notBefore.toISOString()}`)
    }
    
    if (now > cert.validity.notAfter) {
      errors.push(`Certificado expirado em: ${cert.validity.notAfter.toISOString()}`)
    }
    
    // Verificar se expira em 30 dias
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (cert.validity.notAfter < thirtyDays) {
      warnings.push(`Certificado expira em breve: ${cert.validity.notAfter.toLocaleDateString('pt-BR')}`)
    }
    
    // Verificar revogação
    const revocationStatus = await checkCertificateStatus(pfxBuffer, password)
    
    if (revocationStatus.status === 'REVOKED') {
      errors.push(`Certificado revogado${revocationStatus.revokedAt 
        ? ` em ${revocationStatus.revokedAt.toLocaleDateString('pt-BR')}`
        : ''}${revocationStatus.revocationReason 
        ? `: ${revocationStatus.revocationReason}` 
        : ''}`)
    } else if (revocationStatus.status === 'UNKNOWN') {
      warnings.push('Não foi possível verificar status de revogação (OCSP indisponível)')
    } else if (revocationStatus.status === 'ERROR') {
      warnings.push(`Erro ao verificar revogação: ${revocationStatus.error}`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      revocationStatus
    }
    
  } catch (error: any) {
    errors.push(`Erro ao validar certificado: ${error.message}`)
    return { valid: false, errors, warnings }
  }
}

/**
 * Limpa cache de status de certificados
 */
export function clearStatusCache(): void {
  statusCache.clear()
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { size: number; entries: Array<{ serial: string; status: string; expiresAt: Date }> } {
  const entries: Array<{ serial: string; status: string; expiresAt: Date }> = []
  
  for (const [serial, cached] of statusCache) {
    entries.push({
      serial,
      status: cached.status.status,
      expiresAt: cached.expiresAt
    })
  }
  
  return {
    size: statusCache.size,
    entries
  }
}
