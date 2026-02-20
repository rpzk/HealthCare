/**
 * Serviço de Carimbo de Tempo (TSA) - RFC 3161
 * 
 * Conformidade:
 * - RFC 3161 - Internet X.509 Public Key Infrastructure Time-Stamp Protocol
 * - ICP-Brasil DOC-ICP-11 - Carimbo de Tempo
 * - PAdES-T (PDF Advanced Electronic Signatures - Timestamp)
 * 
 * TSAs ICP-Brasil disponíveis:
 * - ACT Certisign: https://timestamp.certisign.com.br/tsa-client
 * - ACT Valid: https://act.validcertificadora.com.br
 * - ACT Serpro: https://tsa.serpro.gov.br
 * 
 * IMPORTANTE: Para uso em produção, é necessário conta/credencial na TSA escolhida
 */

import * as crypto from 'crypto'
import { logger } from '@/lib/logger'

export interface TimestampResponse {
  success: boolean
  token?: Buffer           // Token de timestamp RFC 3161 (DER encoded)
  tokenBase64?: string     // Token em Base64
  generationTime?: Date    // Horário gerado pela TSA
  serialNumber?: string    // Número de série do timestamp
  tsaName?: string         // Nome da autoridade de timestamp
  hashAlgorithm?: string   // Algoritmo usado no digest
  error?: string           // Mensagem de erro se falhou
}

export interface TSAConfig {
  url: string              // URL da TSA
  username?: string        // Usuário (se requerido)
  password?: string        // Senha (se requerido)
  hashAlgorithm?: 'SHA-256' | 'SHA-384' | 'SHA-512'
  timeout?: number         // Timeout em ms
}

// TSAs ICP-Brasil conhecidas
export const KNOWN_TSAS: Record<string, TSAConfig> = {
  'certisign': {
    url: 'https://timestamp.certisign.com.br/tsa-client',
    hashAlgorithm: 'SHA-256',
    timeout: 30000
  },
  'valid': {
    url: 'https://act.validcertificadora.com.br',
    hashAlgorithm: 'SHA-256',
    timeout: 30000
  },
  'serpro': {
    url: 'https://tsa.serpro.gov.br',
    hashAlgorithm: 'SHA-256',
    timeout: 30000
  },
  // TSA de teste (FreeTSA - apenas para desenvolvimento)
  'freetsa': {
    url: 'https://freetsa.org/tsr',
    hashAlgorithm: 'SHA-256',
    timeout: 30000
  }
}

// OIDs para construção do request
const OID_SHA256 = '2.16.840.1.101.3.4.2.1'
const OID_SHA384 = '2.16.840.1.101.3.4.2.2'
const OID_SHA512 = '2.16.840.1.101.3.4.2.3'
const OID_CONTENT_INFO = '1.2.840.113549.1.7.2'
const OID_TST_INFO = '1.2.840.113549.1.9.16.1.4'

function getHashOID(algorithm: string): string {
  switch (algorithm) {
    case 'SHA-384': return OID_SHA384
    case 'SHA-512': return OID_SHA512
    default: return OID_SHA256
  }
}

/**
 * Calcula o hash do conteúdo para o timestamp
 */
export function calculateMessageImprint(
  content: Buffer,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Buffer {
  const hashAlg = algorithm.toLowerCase().replace('-', '')
  return crypto.createHash(hashAlg).update(content).digest()
}

/**
 * Constrói um timestamp request RFC 3161 simplificado (ASN.1 DER)
 * 
 * TimeStampReq ::= SEQUENCE {
 *   version        INTEGER { v1(1) },
 *   messageImprint MessageImprint,
 *   reqPolicy      TSAPolicyId OPTIONAL,
 *   nonce          INTEGER OPTIONAL,
 *   certReq        BOOLEAN DEFAULT FALSE,
 *   extensions     [0] IMPLICIT Extensions OPTIONAL
 * }
 */
export function buildTimestampRequest(
  messageImprint: Buffer,
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
  nonce?: Buffer
): Uint8Array {
  const oid = getHashOID(hashAlgorithm)
  const oidBytes = encodeOID(oid)
  
  // Usar nonce aleatório se não fornecido
  const nonceValue = nonce || crypto.randomBytes(8)
  
  // MessageImprint ::= SEQUENCE { hashAlgorithm, hashedMessage }
  const algorithmIdentifier = Buffer.concat([
    Buffer.from([0x30, oidBytes.length + 2]), // SEQUENCE
    Buffer.from([0x06, oidBytes.length]),     // OID
    oidBytes,
    Buffer.from([0x05, 0x00])                 // NULL parameters
  ])
  
  const hashedMessage = Buffer.concat([
    Buffer.from([0x04, messageImprint.length]), // OCTET STRING
    messageImprint
  ])
  
  const messageImprintSeq = Buffer.concat([
    Buffer.from([0x30, algorithmIdentifier.length + hashedMessage.length]),
    algorithmIdentifier,
    hashedMessage
  ])
  
  // Version (v1 = 1)
  const version = Buffer.from([0x02, 0x01, 0x01])
  
  // Nonce (INTEGER)
  const nonceEncoded = encodeInteger(nonceValue)
  
  // CertReq (BOOLEAN TRUE - queremos o certificado)
  const certReq = Buffer.from([0x01, 0x01, 0xFF])
  
  // TimeStampReq SEQUENCE
  const requestContent = Buffer.concat([
    version,
    messageImprintSeq,
    nonceEncoded,
    certReq
  ])
  
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x30, requestContent.length]),
    requestContent
  ]))
}

/**
 * Codifica um OID em formato DER
 */
function encodeOID(oid: string): Buffer {
  const parts = oid.split('.').map(Number)
  const bytes: number[] = []
  
  // Primeiros dois componentes
  bytes.push(parts[0] * 40 + parts[1])
  
  // Componentes restantes
  for (let i = 2; i < parts.length; i++) {
    const value = parts[i]
    if (value < 128) {
      bytes.push(value)
    } else {
      const encoded: number[] = []
      let v = value
      encoded.unshift(v & 0x7F)
      v >>= 7
      while (v > 0) {
        encoded.unshift((v & 0x7F) | 0x80)
        v >>= 7
      }
      bytes.push(...encoded)
    }
  }
  
  return Buffer.from(bytes)
}

/**
 * Codifica um INTEGER em formato DER
 */
function encodeInteger(value: Buffer): Buffer {
  let data = value
  
  // Se o primeiro byte tem bit 7 setado, adicionar 0x00 na frente
  if (data[0] & 0x80) {
    data = Buffer.concat([Buffer.from([0x00]), data])
  }
  
  return Buffer.concat([
    Buffer.from([0x02, data.length]),
    data
  ])
}

/**
 * Solicita carimbo de tempo de uma TSA
 */
export async function requestTimestamp(
  content: Buffer,
  config: TSAConfig
): Promise<TimestampResponse> {
  const hashAlgorithm = config.hashAlgorithm || 'SHA-256'
  
  try {
    logger.info('[TSA] Solicitando carimbo de tempo', {
      url: config.url,
      hashAlgorithm,
      contentSize: content.length
    })
    
    // Calcular hash do conteúdo
    const messageImprint = calculateMessageImprint(content, hashAlgorithm)
    
    // Construir request RFC 3161
    const request = buildTimestampRequest(messageImprint, hashAlgorithm)
    
    // Preparar headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/timestamp-query',
      'Accept': 'application/timestamp-reply'
    }
    
    // Adicionar autenticação se configurada
    if (config.username && config.password) {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }
    
    // Fazer requisição HTTP
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeout || 30000)
    
    // Convert to Buffer for fetch body
    const requestBody = Buffer.from(request)
    
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: requestBody,
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      logger.error('[TSA] Erro na resposta HTTP', {
        status: response.status,
        statusText: response.statusText
      })
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const responseBuffer = Buffer.from(await response.arrayBuffer())
    
    // Parsear resposta RFC 3161
    const parsed = parseTimestampResponse(responseBuffer)
    
    if (parsed.success) {
      logger.info('[TSA] Carimbo de tempo obtido com sucesso', {
        tsaName: parsed.tsaName,
        generationTime: parsed.generationTime?.toISOString()
      })
    }
    
    return parsed
    
  } catch (error: any) {
    logger.error('[TSA] Erro ao solicitar carimbo:', error)
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Timeout ao conectar com TSA'
      }
    }
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    }
  }
}

/**
 * Parseia resposta de timestamp RFC 3161 (simplificado)
 */
function parseTimestampResponse(response: Buffer): TimestampResponse {
  try {
    // Verificar se é uma resposta válida (começa com SEQUENCE)
    if (response[0] !== 0x30) {
      return { success: false, error: 'Resposta inválida: não é ASN.1 SEQUENCE' }
    }
    
    // TimeStampResp ::= SEQUENCE {
    //   status         PKIStatusInfo,
    //   timeStampToken ContentInfo OPTIONAL
    // }
    
    // Simplificado: verificar status e extrair token
    // Em produção, usar biblioteca ASN.1 completa como 'asn1js'
    
    // Procurar por ContentInfo (OID de signed-data)
    const signedDataOID = Buffer.from([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x02])
    const signedDataIndex = response.indexOf(signedDataOID)
    
    if (signedDataIndex === -1) {
      // Tentar extrair mensagem de erro do PKIStatusInfo
      // Status 0 = granted, outros são erro
      if (response.length > 5 && response[4] === 0x02 && response[5] === 0x01) {
        const status = response[6]
        if (status !== 0) {
          return {
            success: false,
            error: `TSA retornou status de erro: ${status}`
          }
        }
      }
      return { success: false, error: 'Token de timestamp não encontrado na resposta' }
    }
    
    // Extrair informações básicas (simplificado)
    const generationTime = extractGenerationTime(response)
    
    return {
      success: true,
      token: response,
      tokenBase64: response.toString('base64'),
      generationTime,
      hashAlgorithm: 'SHA-256',
      tsaName: 'Unknown TSA' // Em produção, parsear do certificado
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: `Erro ao parsear resposta: ${error.message}`
    }
  }
}

/**
 * Extrai GeneralizedTime da resposta (simplificado)
 */
function extractGenerationTime(response: Buffer): Date | undefined {
  try {
    // Procurar por GeneralizedTime (tag 0x18) ou UTCTime (tag 0x17)
    for (let i = 0; i < response.length - 15; i++) {
      if (response[i] === 0x18) { // GeneralizedTime
        const len = response[i + 1]
        if (len >= 14 && len <= 17) {
          const timeStr = response.subarray(i + 2, i + 2 + len).toString('ascii')
          // Formato: YYYYMMDDHHmmss[.fff]Z
          const year = parseInt(timeStr.substring(0, 4))
          const month = parseInt(timeStr.substring(4, 6)) - 1
          const day = parseInt(timeStr.substring(6, 8))
          const hour = parseInt(timeStr.substring(8, 10))
          const min = parseInt(timeStr.substring(10, 12))
          const sec = parseInt(timeStr.substring(12, 14))
          return new Date(Date.UTC(year, month, day, hour, min, sec))
        }
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Solicita timestamp usando TSA configurada ou padrão
 */
export async function getTimestamp(content: Buffer): Promise<TimestampResponse> {
  // Obter configuração de TSA do ambiente
  const tsaUrl = process.env.TSA_URL
  const tsaUsername = process.env.TSA_USERNAME
  const tsaPassword = process.env.TSA_PASSWORD
  
  if (tsaUrl) {
    return requestTimestamp(content, {
      url: tsaUrl,
      username: tsaUsername,
      password: tsaPassword,
      hashAlgorithm: 'SHA-256',
      timeout: 30000
    })
  }
  
  // Em desenvolvimento, usar FreeTSA
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[TSA] Usando FreeTSA (apenas desenvolvimento)')
    return requestTimestamp(content, KNOWN_TSAS['freetsa'])
  }
  
  return {
    success: false,
    error: 'TSA não configurada. Defina TSA_URL no ambiente.'
  }
}

/**
 * Verifica se um token de timestamp é válido
 */
export async function verifyTimestamp(
  content: Buffer,
  timestampToken: Buffer
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Calcular hash do conteúdo
    const expectedHash = calculateMessageImprint(content, 'SHA-256')
    
    // Verificação simplificada: procurar hash no token
    // Em produção, fazer verificação criptográfica completa
    if (timestampToken.includes(expectedHash)) {
      return { valid: true }
    }
    
    return {
      valid: false,
      error: 'Hash do conteúdo não corresponde ao timestamp'
    }
    
  } catch (error: any) {
    return {
      valid: false,
      error: error.message
    }
  }
}
