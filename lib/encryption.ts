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

// Validação de chave de criptografia principal (não throw no load para permitir build; falha no primeiro uso em produção)
const rawKey = process.env.ENCRYPTION_KEY || ''
const keyValid = rawKey.length >= 32
if (!keyValid && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  ENCRYPTION_KEY não configurada ou muito curta. Usando chave de desenvolvimento.')
}
const DEV_KEY_PLACEHOLDER = 'dev_key_32_bytes_minimum!!'
const KEY = keyValid ? rawKey.padEnd(32, '0').slice(0, 32) : DEV_KEY_PLACEHOLDER

function assertEncryptionKey(): void {
  if (process.env.NODE_ENV === 'production' && KEY === DEV_KEY_PLACEHOLDER) {
    throw new Error('ENCRYPTION_KEY deve ter pelo menos 32 caracteres em produção')
  }
}

// Chaves versionadas para rotação (carregadas do ambiente)
const VERSIONED_KEYS: Map<string, KeyConfig> = new Map()

// Inicializar chave v1 (atual)
VERSIONED_KEYS.set('v1', {
  key: KEY,
  version: 'v1',
  status: 'ACTIVE'
})

// Carregar chaves adicionais do ambiente (para rotação)
// Formato: ENCRYPTION_KEY_V2, ENCRYPTION_KEY_V3, etc.
for (let i = 2; i <= 10; i++) {
  const envKey = process.env[`ENCRYPTION_KEY_V${i}`]
  if (envKey && envKey.length >= 32) {
    VERSIONED_KEYS.set(`v${i}`, {
      key: envKey.padEnd(32, '0').slice(0, 32),
      version: `v${i}`,
      status: process.env[`ENCRYPTION_KEY_V${i}_STATUS`] === 'DECRYPT_ONLY' ? 'DECRYPT_ONLY' : 'ACTIVE'
    })
  }
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
  assertEncryptionKey()
  try {
    const iv = nodeCrypto.randomBytes(12)
    const cipher = nodeCrypto.createCipheriv(ENC_ALG, Buffer.from(KEY), iv)
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
  assertEncryptionKey()
  try {
    const raw = Buffer.from(payload.slice(5), 'base64')
    const iv = raw.subarray(0,12)
    const tag = raw.subarray(12,28)
    const data = raw.subarray(28)
    const decipher = nodeCrypto.createDecipheriv(ENC_ALG, Buffer.from(KEY), iv)
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
  assertEncryptionKey()
  // Encontrar chave ativa
  let keyConfig: KeyConfig | undefined
  
  if (forceVersion) {
    keyConfig = VERSIONED_KEYS.get(forceVersion)
  } else {
    // Usar a chave ativa com maior versão
    for (const [, config] of VERSIONED_KEYS) {
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
    
    const keyConfig = VERSIONED_KEYS.get(version)
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
  const keyConfig = VERSIONED_KEYS.get(currentVersion)
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
  
  for (const [version, config] of VERSIONED_KEYS) {
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
