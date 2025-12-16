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

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import prisma from '@/lib/prisma'

// Chave de criptografia do .env (deve ser mantida em .env)
const MASTER_KEY = process.env.ENCRYPTION_KEY || ''

if (!MASTER_KEY || MASTER_KEY.length < 32) {
  console.warn('⚠️ ENCRYPTION_KEY não configurada adequadamente')
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
  /**
   * Criptografa um valor usando AES-256-CBC
   */
  private static encrypt(value: string): string {
    if (!MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não configurada')
    }

    const iv = randomBytes(16)
    const cipher = createCipheriv(
      'aes-256-cbc',
      Buffer.from(MASTER_KEY, 'hex'),
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
    if (!MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não configurada')
    }

    const [ivHex, encryptedHex] = encryptedValue.split(':')
    
    if (!ivHex || !encryptedHex) {
      throw new Error('Formato inválido de dado criptografado')
    }

    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(MASTER_KEY, 'hex'),
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

    // Criptografar se necessário
    const finalValue = encrypted ? this.encrypt(value) : value

    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: finalValue,
        description,
        category,
        isPublic,
        encrypted,
        updatedBy,
      },
      update: {
        value: finalValue,
        description,
        category,
        isPublic,
        encrypted,
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
