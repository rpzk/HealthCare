/**
 * LabAuthService
 *
 * Autenticação de laboratórios externos que enviam resultados via FHIR/HL7.
 *
 * Modelo de segurança:
 * - Cada laboratório tem um code único (ex: "DASA", "FLEURY")
 * - A chave API é gerada uma única vez e retornada em texto puro ao admin
 * - Apenas o hash bcrypt é armazenado no banco — nunca a chave em texto puro
 * - Rotação de chave gera nova chave e invalida a anterior
 * - IP allowlist opcional por laboratório
 */

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const BCRYPT_ROUNDS = 12
const KEY_PREFIX = 'lab_'

export interface LabAuthResult {
  valid: boolean
  lab?: {
    id: string
    name: string
    code: string
    tenantId: string | null
    allowedIps: string[]
  }
  error?: string
}

export interface GeneratedKey {
  /** Texto puro — exibir ao admin UMA VEZ, nunca regravar. */
  plaintext: string
  /** Hash bcrypt para armazenar no banco. */
  hash: string
}

export class LabAuthService {
  /**
   * Gera um par chave/hash para um novo laboratório ou rotação.
   * O plaintext nunca é armazenado — responsabilidade do chamador exibi-lo ao admin.
   */
  static generateApiKey(): GeneratedKey {
    const plaintext = `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`
    const hash = bcrypt.hashSync(plaintext, BCRYPT_ROUNDS)
    return { plaintext, hash }
  }

  /**
   * Valida a chave API de um laboratório.
   *
   * @param apiKey  - Chave em texto puro enviada no header
   * @param labCode - Identificador do laboratório (header x-lab-code)
   * @param clientIp - IP do cliente (para validação de allowlist)
   */
  static async validateApiKey(
    apiKey: string,
    labCode: string,
    clientIp?: string
  ): Promise<LabAuthResult> {
    if (!apiKey || !labCode) {
      return { valid: false, error: 'Credenciais ausentes' }
    }

    const lab = await prisma.laboratory.findUnique({
      where: { code: labCode },
      select: {
        id: true,
        name: true,
        code: true,
        apiKeyHash: true,
        active: true,
        tenantId: true,
        allowedIps: true,
      },
    })

    if (!lab) {
      // Timing-safe: mesmo sem lab, compara para não vazar timing
      bcrypt.compareSync(apiKey, '$2b$12$invalidhashtopreventtimingattac')
      logger.warn(`[LabAuth] Laboratório não encontrado: ${labCode}`)
      return { valid: false, error: 'Credenciais inválidas' }
    }

    if (!lab.active) {
      logger.warn(`[LabAuth] Laboratório inativo: ${labCode}`)
      return { valid: false, error: 'Laboratório inativo' }
    }

    // IP allowlist
    if (lab.allowedIps.length > 0 && clientIp) {
      if (!lab.allowedIps.includes(clientIp)) {
        logger.warn(`[LabAuth] IP não autorizado ${clientIp} para lab ${labCode}`)
        return { valid: false, error: 'IP não autorizado' }
      }
    }

    // Comparação bcrypt (lenta por design — evita brute-force)
    const valid = bcrypt.compareSync(apiKey, lab.apiKeyHash)
    if (!valid) {
      logger.warn(`[LabAuth] Chave inválida para lab: ${labCode}`)
      return { valid: false, error: 'Credenciais inválidas' }
    }

    logger.info(`[LabAuth] Autenticado: ${lab.name} (${labCode})`)
    return {
      valid: true,
      lab: {
        id: lab.id,
        name: lab.name,
        code: lab.code,
        tenantId: lab.tenantId,
        allowedIps: lab.allowedIps,
      },
    }
  }
}
