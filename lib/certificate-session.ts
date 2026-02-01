/**
 * Gerenciador de Sessão de Certificado Digital
 * 
 * Implementa um modelo similar aos serviços de certificado em nuvem (SafeID, BirdID, VIDaaS):
 * - Autenticação única da senha do certificado
 * - Sessão temporária configurável (1-12 horas)
 * - Bloqueio manual ou automático por inatividade
 * - Armazenamento seguro em Redis (criptografado)
 * 
 * SEGURANÇA:
 * - Senha criptografada com AES-256-GCM
 * - Chave derivada do ID do usuário + secret do servidor
 * - TTL automático no Redis
 * - Não persiste em disco
 */

import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Redis client - usar ioredis (mesmo usado no rate-limiter)
let redisClient: any = null

async function getRedis(): Promise<any> {
  if (redisClient) return redisClient
  
  try {
    // Import dinâmico usando ioredis (já instalado no projeto)
    const Redis = (await import('ioredis')).default
    
    const host = (process.env.REDIS_HOST ?? '').trim() || 'localhost'
    const portRaw = (process.env.REDIS_PORT ?? '').trim()
    const port = portRaw && !isNaN(Number(portRaw)) ? Number(portRaw) : 6379
    
    const redisOptions: Record<string, unknown> = {
      host,
      port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    }
    
    const password = (process.env.REDIS_PASSWORD ?? '').trim()
    if (password) {
      redisOptions.password = password
    }
    
    redisClient = new Redis(redisOptions)
    
    redisClient.on('error', (err: Error) => {
      logger.error('Redis certificate session error:', err)
    })
    
    // Testar conexão
    await redisClient.ping()
    logger.info('Redis certificate session initialized')
    
    return redisClient
  } catch (error) {
    logger.warn('Redis não disponível, usando memória local (menos seguro)')
    return null
  }
}

// Fallback para memória local (desenvolvimento/teste)
const memoryStore = new Map<string, { value: string; expiresAt: number }>()

// Configurações
const CONFIG = {
  // Tempo padrão de sessão do certificado (em segundos)
  DEFAULT_SESSION_DURATION: 4 * 60 * 60, // 4 horas
  
  // Tempo máximo permitido
  MAX_SESSION_DURATION: 12 * 60 * 60, // 12 horas
  
  // Tempo de inatividade para bloqueio automático (em segundos)
  INACTIVITY_TIMEOUT: 30 * 60, // 30 minutos
  
  // Prefixo das chaves no Redis
  KEY_PREFIX: 'cert-session:',
  
  // Prefixo para última atividade
  ACTIVITY_PREFIX: 'cert-activity:',
}

// Chave de criptografia derivada
function deriveKey(userId: string): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'
  return crypto.pbkdf2Sync(secret, userId, 100000, 32, 'sha256')
}

// Criptografar senha
function encryptPassword(password: string, userId: string): string {
  const key = deriveKey(userId)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(password, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// Descriptografar senha
function decryptPassword(encryptedData: string, userId: string): string {
  const key = deriveKey(userId)
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// ============================================
// API PÚBLICA
// ============================================

export interface CertificateSessionOptions {
  /** Duração da sessão em segundos (padrão: 4 horas, máximo: 12 horas) */
  duration?: number
  
  /** Tempo de inatividade para bloqueio automático (padrão: 30 min) */
  inactivityTimeout?: number
}

export interface CertificateSessionInfo {
  active: boolean
  createdAt?: Date
  expiresAt?: Date
  lastActivity?: Date
  remainingTime?: number // em segundos
  locked?: boolean
}

/**
 * Inicia uma sessão de certificado para o usuário
 * 
 * @param userId - ID do usuário
 * @param certificatePassword - Senha do certificado A1
 * @param options - Opções de configuração
 * @returns true se a sessão foi criada com sucesso
 */
export async function startCertificateSession(
  userId: string,
  certificatePassword: string,
  options: CertificateSessionOptions = {}
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  try {
    const duration = Math.min(
      options.duration || CONFIG.DEFAULT_SESSION_DURATION,
      CONFIG.MAX_SESSION_DURATION
    )
    
    const encrypted = encryptPassword(certificatePassword, userId)
    const expiresAt = new Date(Date.now() + duration * 1000)
    
    const sessionData = JSON.stringify({
      encrypted,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      inactivityTimeout: options.inactivityTimeout || CONFIG.INACTIVITY_TIMEOUT,
    })
    
    const redis = await getRedis()
    
    if (redis) {
      // Armazenar no Redis com TTL
      await redis.setex(
        `${CONFIG.KEY_PREFIX}${userId}`,
        duration,
        sessionData
      )
      
      // Registrar última atividade
      await redis.setex(
        `${CONFIG.ACTIVITY_PREFIX}${userId}`,
        options.inactivityTimeout || CONFIG.INACTIVITY_TIMEOUT,
        Date.now().toString()
      )
    } else {
      // Fallback para memória
      memoryStore.set(`${CONFIG.KEY_PREFIX}${userId}`, {
        value: sessionData,
        expiresAt: Date.now() + duration * 1000,
      })
      memoryStore.set(`${CONFIG.ACTIVITY_PREFIX}${userId}`, {
        value: Date.now().toString(),
        expiresAt: Date.now() + (options.inactivityTimeout || CONFIG.INACTIVITY_TIMEOUT) * 1000,
      })
    }
    
    logger.info(`[CertSession] Sessão iniciada para usuário ${userId.substring(0, 8)}...`, {
      duration: `${duration / 3600}h`,
      expiresAt: expiresAt.toISOString(),
    })
    
    return { success: true, expiresAt }
    
  } catch (error) {
    logger.error('[CertSession] Erro ao iniciar sessão:', error)
    return { success: false, error: 'Erro ao iniciar sessão do certificado' }
  }
}

/**
 * Obtém a senha do certificado da sessão ativa
 * Atualiza automaticamente o timestamp de atividade
 * 
 * @param userId - ID do usuário
 * @returns Senha descriptografada ou null se sessão inativa/expirada
 */
export async function getCertificatePassword(userId: string): Promise<string | null> {
  try {
    const redis = await getRedis()
    let sessionData: string | null = null
    let lastActivity: string | null = null
    
    if (redis) {
      sessionData = await redis.get(`${CONFIG.KEY_PREFIX}${userId}`)
      lastActivity = await redis.get(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    } else {
      // Fallback memória
      const stored = memoryStore.get(`${CONFIG.KEY_PREFIX}${userId}`)
      if (stored && stored.expiresAt > Date.now()) {
        sessionData = stored.value
      }
      const activity = memoryStore.get(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
      if (activity && activity.expiresAt > Date.now()) {
        lastActivity = activity.value
      }
    }
    
    if (!sessionData) {
      return null // Sessão não existe ou expirou
    }
    
    // Verificar inatividade
    if (!lastActivity) {
      logger.info(`[CertSession] Sessão bloqueada por inatividade para ${userId.substring(0, 8)}...`)
      return null // Bloqueado por inatividade
    }
    
    const session = JSON.parse(sessionData)
    const password = decryptPassword(session.encrypted, userId)
    
    // Atualizar última atividade
    const inactivityTimeout = session.inactivityTimeout || CONFIG.INACTIVITY_TIMEOUT
    
    if (redis) {
      await redis.setex(
        `${CONFIG.ACTIVITY_PREFIX}${userId}`,
        inactivityTimeout,
        Date.now().toString()
      )
    } else {
      memoryStore.set(`${CONFIG.ACTIVITY_PREFIX}${userId}`, {
        value: Date.now().toString(),
        expiresAt: Date.now() + inactivityTimeout * 1000,
      })
    }
    
    return password
    
  } catch (error) {
    logger.error('[CertSession] Erro ao obter senha:', error)
    return null
  }
}

/**
 * Verifica o status da sessão do certificado
 */
export async function getCertificateSessionInfo(userId: string): Promise<CertificateSessionInfo> {
  try {
    const redis = await getRedis()
    let sessionData: string | null = null
    let lastActivity: string | null = null
    
    if (redis) {
      sessionData = await redis.get(`${CONFIG.KEY_PREFIX}${userId}`)
      lastActivity = await redis.get(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    } else {
      const stored = memoryStore.get(`${CONFIG.KEY_PREFIX}${userId}`)
      if (stored && stored.expiresAt > Date.now()) {
        sessionData = stored.value
      }
      const activity = memoryStore.get(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
      if (activity && activity.expiresAt > Date.now()) {
        lastActivity = activity.value
      }
    }
    
    if (!sessionData) {
      return { active: false }
    }
    
    const session = JSON.parse(sessionData)
    const expiresAt = new Date(session.expiresAt)
    const remainingTime = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    
    return {
      active: true,
      createdAt: new Date(session.createdAt),
      expiresAt,
      lastActivity: lastActivity ? new Date(parseInt(lastActivity)) : undefined,
      remainingTime,
      locked: !lastActivity, // Bloqueado se não tem registro de atividade
    }
    
  } catch (error) {
    logger.error('[CertSession] Erro ao obter info:', error)
    return { active: false }
  }
}

/**
 * Bloqueia a sessão do certificado (mantém a sessão mas requer senha novamente)
 */
export async function lockCertificateSession(userId: string): Promise<boolean> {
  try {
    const redis = await getRedis()
    
    if (redis) {
      // Remove apenas o registro de atividade, mantendo a sessão
      await redis.del(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    } else {
      memoryStore.delete(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    }
    
    logger.info(`[CertSession] Sessão bloqueada manualmente para ${userId.substring(0, 8)}...`)
    return true
    
  } catch (error) {
    logger.error('[CertSession] Erro ao bloquear:', error)
    return false
  }
}

/**
 * Desbloqueia a sessão com a senha (reativa sem criar nova sessão)
 */
export async function unlockCertificateSession(
  userId: string,
  certificatePassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const redis = await getRedis()
    let sessionData: string | null = null
    
    if (redis) {
      sessionData = await redis.get(`${CONFIG.KEY_PREFIX}${userId}`)
    } else {
      const stored = memoryStore.get(`${CONFIG.KEY_PREFIX}${userId}`)
      if (stored && stored.expiresAt > Date.now()) {
        sessionData = stored.value
      }
    }
    
    if (!sessionData) {
      return { success: false, error: 'Sessão expirada. Inicie uma nova sessão.' }
    }
    
    // Verificar se a senha está correta
    const session = JSON.parse(sessionData)
    const storedPassword = decryptPassword(session.encrypted, userId)
    
    if (certificatePassword !== storedPassword) {
      return { success: false, error: 'Senha incorreta' }
    }
    
    // Reativar registro de atividade
    const inactivityTimeout = session.inactivityTimeout || CONFIG.INACTIVITY_TIMEOUT
    
    if (redis) {
      await redis.setex(
        `${CONFIG.ACTIVITY_PREFIX}${userId}`,
        inactivityTimeout,
        Date.now().toString()
      )
    } else {
      memoryStore.set(`${CONFIG.ACTIVITY_PREFIX}${userId}`, {
        value: Date.now().toString(),
        expiresAt: Date.now() + inactivityTimeout * 1000,
      })
    }
    
    logger.info(`[CertSession] Sessão desbloqueada para ${userId.substring(0, 8)}...`)
    return { success: true }
    
  } catch (error) {
    logger.error('[CertSession] Erro ao desbloquear:', error)
    return { success: false, error: 'Erro ao desbloquear sessão' }
  }
}

/**
 * Encerra completamente a sessão do certificado
 */
export async function endCertificateSession(userId: string): Promise<boolean> {
  try {
    const redis = await getRedis()
    
    if (redis) {
      await redis.del(`${CONFIG.KEY_PREFIX}${userId}`)
      await redis.del(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    } else {
      memoryStore.delete(`${CONFIG.KEY_PREFIX}${userId}`)
      memoryStore.delete(`${CONFIG.ACTIVITY_PREFIX}${userId}`)
    }
    
    logger.info(`[CertSession] Sessão encerrada para ${userId.substring(0, 8)}...`)
    return true
    
  } catch (error) {
    logger.error('[CertSession] Erro ao encerrar:', error)
    return false
  }
}

/**
 * Verifica se há uma sessão de certificado ativa e não bloqueada
 */
export async function hasCertificateSession(userId: string): Promise<boolean> {
  const info = await getCertificateSessionInfo(userId)
  return info.active && !info.locked
}

// Exportar configuração para uso externo
export const CERTIFICATE_SESSION_CONFIG = CONFIG
