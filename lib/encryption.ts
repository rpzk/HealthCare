import nodeCrypto from 'crypto'

const ENC_ALG = 'aes-256-gcm'

// ============================================
// Configuração de Chaves de Criptografia
// Suporta múltiplas versões para rotação segura
// ============================================
interface KeyConfig {
  key: string
  version: string
  status: 'ACTIVE' | 'DECRYPT_ONLY' | 'EXPIRED'
}

// Lazy-initialized key — validated on first encrypt/decrypt call, not on import.
// This prevents build-time failures when ENCRYPTION_KEY is not set in CI/Docker build args.
// Em desenvolvimento, gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
let _key: string | null = null

function getKey(): string {
  if (_key !== null) return _key
  const rawKey = process.env.ENCRYPTION_KEY || ''
  if (rawKey.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[encryption] ENCRYPTION_KEY ausente ou inválida (mínimo 32 caracteres). ' +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      )
    } else {
      throw new Error(
        '[encryption] ENCRYPTION_KEY não configurada. ' +
        'Adicione ao .env.local: ENCRYPTION_KEY=' +
        nodeCrypto.randomBytes(32).toString('hex')
      )
    }
  }
  _key = rawKey.padEnd(32, '0').slice(0, 32)
  return _key
}

// Chaves versionadas para rotação — também lazy
let _versionedKeys: Map<string, KeyConfig> | null = null

function getVersionedKeys(): Map<string, KeyConfig> {
  if (_versionedKeys !== null) return _versionedKeys
  const key = getKey()
  const map = new Map<string, KeyConfig>()
  map.set('v1', { key, version: 'v1', status: 'ACTIVE' })
  for (let i = 2; i <= 10; i++) {
    const envKey = process.env[`ENCRYPTION_KEY_V${i}`]
    if (envKey && envKey.length >= 32) {
      map.set(`v${i}`, {
        key: envKey.padEnd(32, '0').slice(0, 32),
        version: `v${i}`,
        status: process.env[`ENCRYPTION_KEY_V${i}_STATUS`] === 'DECRYPT_ONLY' ? 'DECRYPT_ONLY' : 'ACTIVE'
      })
    }
  }
  _versionedKeys = map
  return map
}

// Validação de salt
const SALT = process.env.HASH_SALT
if (!SALT || SALT === 'default_salt') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  HASH_SALT não configurado. Usando salt de desenvolvimento.')
  }
}
const EFFECTIVE_SALT = SALT || 'dev_salt_do_not_use_in_production'

// ============================================
// Funções básicas de criptografia (compatibilidade)
// ============================================

export function encrypt(value?: string | null): string | null {
  if (!value) return null
  try {
    const key = getKey()
    const iv = nodeCrypto.randomBytes(12)
    const cipher = nodeCrypto.createCipheriv(ENC_ALG, Buffer.from(key), iv)
    const enc = Buffer.concat([cipher.update(value,'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return 'enc::' + Buffer.concat([iv, tag, enc]).toString('base64')
  } catch {
    return null
  }
}

export function decrypt(payload?: string | null): string | null {
  if (!payload) return null
  if (!payload.startsWith('enc::')) return payload
  try {
    const key = getKey()
    const raw = Buffer.from(payload.slice(5), 'base64')
    const iv = raw.subarray(0,12)
    const tag = raw.subarray(12,28)
    const data = raw.subarray(28)
    const decipher = nodeCrypto.createDecipheriv(ENC_ALG, Buffer.from(key), iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return null
  }
}

export function hashCPF(cpf?: string | null): string | null {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g,'')
  return nodeCrypto.createHash('sha256').update(EFFECTIVE_SALT + ':' + digits).digest('hex')
}

// ============================================
// Criptografia versionada para campos sensíveis
// Formato: encv::<version>::<base64_payload>
// ============================================

/**
 * Criptografa um campo sensível com versionamento de chave
 * Usa a chave ativa mais recente
 */
export function encryptField(value?: string | null, forceVersion?: string): string | null {
  if (!value) return null
  const versionedKeys = getVersionedKeys()
  // Encontrar chave ativa
  let keyConfig: KeyConfig | undefined

  if (forceVersion) {
    keyConfig = versionedKeys.get(forceVersion)
  } else {
    // Usar a chave ativa com maior versão
    for (const [, config] of versionedKeys) {
      if (config.status === 'ACTIVE') {
        if (!keyConfig || config.version > keyConfig.version) {
          keyConfig = config
        }
      }
    }
  }
  
  if (!keyConfig) {
    console.error('Nenhuma chave ativa encontrada para criptografia')
    return null
  }
  
  try {
    const iv = nodeCrypto.randomBytes(12)
    const cipher = nodeCrypto.createCipheriv(ENC_ALG, Buffer.from(keyConfig.key), iv)
    const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    const payload = Buffer.concat([iv, tag, enc]).toString('base64')
    return `encv::${keyConfig.version}::${payload}`
  } catch (error) {
    console.error('Erro ao criptografar campo:', error)
    return null
  }
}

/**
 * Descriptografa um campo sensível com suporte a múltiplas versões de chave
 */
export function decryptField(payload?: string | null): string | null {
  if (!payload) return null
  
  // Formato antigo (compatibilidade)
  if (payload.startsWith('enc::')) {
    return decrypt(payload)
  }
  
  // Formato versionado: encv::<version>::<payload>
  if (!payload.startsWith('encv::')) {
    return payload // Não criptografado
  }
  
  try {
    const parts = payload.split('::')
    if (parts.length !== 3) {
      console.error('Formato de payload inválido')
      return null
    }
    
    const version = parts[1]
    const encData = parts[2]
    
    const keyConfig = getVersionedKeys().get(version)
    if (!keyConfig) {
      console.error(`Chave versão ${version} não encontrada`)
      return null
    }
    
    if (keyConfig.status === 'EXPIRED') {
      console.error(`Chave versão ${version} expirada - requer rotação`)
      return null
    }
    
    const raw = Buffer.from(encData, 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const data = raw.subarray(28)
    
    const decipher = nodeCrypto.createDecipheriv(ENC_ALG, Buffer.from(keyConfig.key), iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString('utf8')
  } catch (error) {
    console.error('Erro ao descriptografar campo:', error)
    return null
  }
}

/**
 * Extrai a versão da chave usada em um payload criptografado
 */
export function getEncryptionVersion(payload?: string | null): string | null {
  if (!payload) return null
  
  if (payload.startsWith('enc::')) return 'v1'
  
  if (payload.startsWith('encv::')) {
    const parts = payload.split('::')
    return parts[1] || null
  }
  
  return null // Não criptografado
}

/**
 * Verifica se um valor precisa ser recriptografado com uma nova chave
 */
export function needsKeyRotation(payload?: string | null, targetVersion?: string): boolean {
  if (!payload) return false
  
  const currentVersion = getEncryptionVersion(payload)
  if (!currentVersion) return false // Não criptografado
  
  // Se versão alvo especificada, comparar
  if (targetVersion) {
    return currentVersion !== targetVersion
  }
  
  // Verificar se a chave atual ainda está ativa
  const keyConfig = getVersionedKeys().get(currentVersion)
  if (!keyConfig) return true // Chave desconhecida
  
  return keyConfig.status !== 'ACTIVE'
}

/**
 * Rotaciona um campo criptografado para a versão mais recente da chave
 */
export function rotateEncryption(payload?: string | null): string | null {
  if (!payload) return null
  
  const decrypted = decryptField(payload)
  if (!decrypted) return null
  
  return encryptField(decrypted)
}

/**
 * Gera hash de verificação de uma chave (para auditoria)
 * Usa apenas os primeiros 8 caracteres + timestamp
 */
export function generateKeyHash(key: string): string {
  const prefix = key.slice(0, 8)
  return nodeCrypto.createHash('sha256').update(prefix + EFFECTIVE_SALT).digest('hex').slice(0, 32)
}

/**
 * Lista versões de chave disponíveis (para diagnóstico)
 */
export function listKeyVersions(): Array<{ version: string; status: string; hashPrefix: string }> {
  const result: Array<{ version: string; status: string; hashPrefix: string }> = []
  
  for (const [version, config] of getVersionedKeys()) {
    result.push({
      version,
      status: config.status,
      hashPrefix: generateKeyHash(config.key).slice(0, 8)
    })
  }
  
  return result.sort((a, b) => a.version.localeCompare(b.version))
}

// ============================================
// Criptografia de objetos JSON (para campos complexos)
// ============================================

/**
 * Criptografa um objeto JSON inteiro
 */
export function encryptJSON<T>(obj?: T | null): string | null {
  if (obj === null || obj === undefined) return null
  
  try {
    const json = JSON.stringify(obj)
    return encryptField(json)
  } catch {
    return null
  }
}

/**
 * Descriptografa um objeto JSON
 */
export function decryptJSON<T>(payload?: string | null): T | null {
  if (!payload) return null
  
  try {
    const json = decryptField(payload)
    if (!json) return null
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
