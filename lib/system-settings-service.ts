/**
 * System Settings Service - Gerenciamento centralizado de configurações
 * 
 * Features:
 * - Armazenamento de configs no banco de dados
 * - Criptografia automática para valores sensíveis
 * - Fallback para variáveis de ambiente
 * - Cache em memória para performance
 * - Categorização de settings
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import prisma from '@/lib/prisma'

// Chave de criptografia do .env (deve ser mantida em .env)
const MASTER_KEY_RAW = process.env.ENCRYPTION_KEY || ''

const isHex = (s: string) => /^[0-9a-fA-F]+$/.test(s)
const KEY_BYTES = (() => {
  if (!MASTER_KEY_RAW) return null
  // Preferir chave em hex (32 bytes => 64 chars hex)
  if (MASTER_KEY_RAW.length === 64 && isHex(MASTER_KEY_RAW)) {
    return Buffer.from(MASTER_KEY_RAW, 'hex')
  }
  // Fallback seguro: derivar 32 bytes via SHA-256 (aceita passphrase)
  return createHash('sha256').update(MASTER_KEY_RAW, 'utf8').digest()
})()

const HAS_MASTER_KEY = !!KEY_BYTES

if (!HAS_MASTER_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY não configurada — valores sensíveis serão salvos sem criptografia')
} else if (MASTER_KEY_RAW.length !== 64 || !isHex(MASTER_KEY_RAW)) {
  console.warn('⚠️ ENCRYPTION_KEY não está em hex (64 chars). Usando derivação SHA-256 para criptografia.')
}

// Cache em memória (TTL: 5 minutos)
interface CacheEntry {
  value: string
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Categorias de configurações
 */
export enum SettingCategory {
  GENERAL = 'GENERAL',
  EMAIL = 'EMAIL',
  STORAGE = 'STORAGE',
  WHATSAPP = 'WHATSAPP',
  REDIS = 'REDIS',
  WEBRTC = 'WEBRTC',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

/**
 * Interface para configuração
 */
export interface SystemSettingData {
  key: string
  value: string
  description?: string
  category?: SettingCategory
  isPublic?: boolean
  encrypted?: boolean
}

/**
 * Service de configurações do sistema
 */
export class SystemSettingsService {
  private static isMaskedSecret(val: unknown): boolean {
    if (typeof val !== 'string') return false
    const trimmed = val.trim()
    return trimmed.length > 0 && (/^[*•]+$/.test(trimmed) || trimmed === '********')
  }

  /**
   * Criptografa um valor usando AES-256-CBC
   */
  private static encrypt(value: string): string {
    if (!KEY_BYTES) {
      throw new Error('ENCRYPTION_KEY não configurada')
    }

    const iv = randomBytes(16)
    const cipher = createCipheriv(
      'aes-256-cbc',
      KEY_BYTES,
      iv
    )

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ])

    // Retorna IV + encrypted em hex
    return iv.toString('hex') + ':' + encrypted.toString('hex')
  }

  /**
   * Descriptografa um valor
   */
  private static decrypt(encryptedValue: string): string {
    if (!KEY_BYTES) {
      throw new Error('ENCRYPTION_KEY não configurada')
    }

    const [ivHex, encryptedHex] = encryptedValue.split(':')
    
    if (!ivHex || !encryptedHex) {
      throw new Error('Formato inválido de dado criptografado')
    }

    const decipher = createDecipheriv(
      'aes-256-cbc',
      KEY_BYTES,
      Buffer.from(ivHex, 'hex')
    )

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  }

  /**
   * Limpa cache
   */
  static clearCache(key?: string) {
    if (key) {
      cache.delete(key)
    } else {
      cache.clear()
    }
  }

  /**
   * Obtém configuração (com fallback para .env)
   */
  static async get(key: string, defaultValue?: string): Promise<string | undefined> {
    // 1. Verificar cache
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value
    }

    try {
      // 2. Buscar no banco
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
      })

      if (setting) {
        // Descriptografar se necessário
        const value = setting.encrypted
          ? this.decrypt(setting.value)
          : setting.value

        // Cachear
        cache.set(key, { value, timestamp: Date.now() })
        return value
      }
    } catch (error) {
      console.error(`Erro ao buscar setting ${key}:`, error)
    }

    // 3. Fallback para .env
    const envValue = process.env[key]
    if (envValue) {
      return envValue
    }

    // 4. Retornar default
    return defaultValue
  }

  /**
   * Define ou atualiza configuração
   */
  static async set(
    key: string,
    value: string,
    options: {
      description?: string
      category?: SettingCategory
      isPublic?: boolean
      encrypted?: boolean
      updatedBy?: string
    } = {}
  ): Promise<void> {
    const {
      description,
      category = SettingCategory.GENERAL,
      isPublic = false,
      encrypted = false,
      updatedBy,
    } = options

    // Criptografar se possível; caso contrário, salvar sem criptografia para não bloquear persistência
    const shouldEncrypt = encrypted && HAS_MASTER_KEY
    if (encrypted && !HAS_MASTER_KEY) {
      console.warn(`[SystemSettingsService] ENCRYPTION_KEY ausente/curta; salvando ${key} sem criptografia`)
    }

    const finalValue = shouldEncrypt ? this.encrypt(value) : value

    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: finalValue,
        description,
        category,
        isPublic,
        encrypted: shouldEncrypt,
        updatedBy,
      },
      update: {
        value: finalValue,
        description,
        category,
        isPublic,
        encrypted: shouldEncrypt,
        updatedBy,
        updatedAt: new Date(),
      },
    })

    // Limpar cache
    this.clearCache(key)
  }

  /**
   * Remove configuração
   */
  static async delete(key: string): Promise<void> {
    await prisma.systemSetting.delete({
      where: { key },
    })

    this.clearCache(key)
  }

  /**
   * Lista todas as configurações (opcionalmente por categoria)
   */
  static async list(options: {
    category?: SettingCategory
    includeEncrypted?: boolean
    publicOnly?: boolean
  } = {}): Promise<SystemSettingData[]> {
    const { category, includeEncrypted = false, publicOnly = false } = options

    const where: any = {}
    if (category) where.category = category
    if (publicOnly) where.isPublic = true

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    return settings.map((s) => ({
      key: s.key,
      value: s.encrypted && !includeEncrypted ? '********' : s.value,
      description: s.description || undefined,
      category: s.category as SettingCategory,
      isPublic: s.isPublic,
      encrypted: s.encrypted,
    }))
  }

  /**
   * Obtém múltiplas configurações de uma vez
   */
  static async getMany(keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    for (const key of keys) {
      const value = await this.get(key)
      if (value !== undefined) {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Retorna a senha SMTP mais recente e válida entre SMTP_PASS e SMTP_PASSWORD.
   * Preferência: registro com updatedAt mais recente no banco.
   */
  static async getSmtpPassword(): Promise<string | undefined> {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['SMTP_PASS', 'SMTP_PASSWORD'] } },
        orderBy: { updatedAt: 'desc' },
        take: 2,
      })

      for (const s of settings) {
        try {
          const rawValue = s.encrypted ? this.decrypt(s.value) : s.value
          const value = (rawValue || '').trim()
          if (!value) continue
          if (this.isMaskedSecret(value)) continue
          return value
        } catch (e) {
          // Se não conseguir descriptografar um registro, tenta o próximo
          console.error(`Erro ao descriptografar ${s.key}:`, e)
          continue
        }
      }
    } catch (e) {
      console.error('Erro ao buscar senha SMTP no banco:', e)
    }

    // Fallback para env vars
    const envCandidates = [process.env.SMTP_PASS, process.env.SMTP_PASSWORD]
      .map((v) => (v || '').trim())
      .filter((v) => v && !this.isMaskedSecret(v))
    return envCandidates[0]
  }

  /**
   * Define múltiplas configurações de uma vez
   */
  static async setMany(
    settings: Array<{
      key: string
      value: string
      encrypted?: boolean
      description?: string
      category?: SettingCategory
    }>,
    updatedBy?: string
  ): Promise<void> {
    for (const setting of settings) {
      await this.set(setting.key, setting.value, {
        encrypted: setting.encrypted,
        description: setting.description,
        category: setting.category,
        updatedBy,
      })
    }
  }

  /**
   * Helpers para configurações comuns
   */

  // Storage
  static async getStorageType(): Promise<'local' | 's3' | 'minio'> {
    return (await this.get('STORAGE_TYPE', 'local')) as 'local' | 's3' | 'minio'
  }

  static async getStorageConfig() {
    return {
      type: await this.getStorageType(),
      bucket: await this.get('STORAGE_BUCKET', 'recordings'),
      region: await this.get('STORAGE_REGION', 'us-east-1'),
      endpoint: await this.get('STORAGE_ENDPOINT', ''),
      path: await this.get('LOCAL_STORAGE_PATH', './uploads/recordings'),
      accessKey: await this.get('STORAGE_ACCESS_KEY', ''),
      secretKey: await this.get('STORAGE_SECRET_KEY', ''),
      useSSL: (await this.get('STORAGE_USE_SSL', 'true')) === 'true',
      localPath: await this.get('LOCAL_STORAGE_PATH', './uploads'),
    }
  }

  // Redis
  static async getRedisConfig() {
    return {
      host: await this.get('REDIS_HOST', 'localhost'),
      port: parseInt((await this.get('REDIS_PORT', '6379')) || '6379'),
      password: await this.get('REDIS_PASSWORD', ''),
    }
  }

  // WhatsApp
  static async getWhatsAppConfig() {
    return {
      provider: await this.get('WHATSAPP_PROVIDER', 'evolution'),
      apiUrl: await this.get('WHATSAPP_API_URL', ''),
      apiKey: await this.get('WHATSAPP_API_KEY', ''),
      instanceId: await this.get('WHATSAPP_INSTANCE_ID', ''),
    }
  }

  // Email
  static async getEmailConfig() {
    return {
      host: await this.get('SMTP_HOST', ''),
      port: parseInt((await this.get('SMTP_PORT', '587')) || '587'),
      user: await this.get('SMTP_USER', ''),
      pass: await this.get('SMTP_PASS', ''),
      from: await this.get('SMTP_FROM', ''),
    }
  }

  // WebRTC
  static async getWebRTCConfig() {
    const iceServers = (await this.get('NEXT_PUBLIC_ICE', 'stun:stun.l.google.com:19302')) || 'stun:stun.l.google.com:19302'
    return {
      iceServers: iceServers.split(',').map((server) => server.trim()),
    }
  }
}
