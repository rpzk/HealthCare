/**
 * Input Sanitization Utilities
 * Previne XSS, SQL Injection e outros ataques de injeção
 */

/**
 * Remove caracteres HTML perigosos de uma string
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Remove caracteres que podem ser usados em SQL injection
 * Nota: Prisma já usa prepared statements, mas isso adiciona uma camada extra
 */
export function sanitizeSqlLike(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // Escapa caracteres especiais do LIKE
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Remove caracteres de controle e normaliza whitespace
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    // Remove caracteres de controle (exceto newline e tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normaliza múltiplos espaços em um só
    .replace(/\s+/g, ' ')
    // Remove espaços no início e fim
    .trim()
}

/**
 * Sanitiza um nome (pessoa, medicamento, etc.)
 */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return sanitizeText(input)
    // Remove caracteres que não são letras, números, espaços ou pontuação básica
    .replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
    // Limita tamanho
    .slice(0, 200)
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .toLowerCase()
    .trim()
    // Remove caracteres inválidos em emails
    .replace(/[^a-z0-9._%+\-@]/g, '')
    .slice(0, 254) // RFC 5321 limit
}

/**
 * Sanitiza telefone (mantém apenas números)
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/\D/g, '')
    .slice(0, 20)
}

/**
 * Sanitiza CPF (mantém apenas números)
 */
export function sanitizeCpf(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/\D/g, '')
    .slice(0, 11)
}

/**
 * Sanitiza um objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    sanitizeStrings?: boolean
    maxDepth?: number
  } = {}
): T {
  const { sanitizeStrings = true, maxDepth = 10 } = options
  
  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return value
    
    if (typeof value === 'string') {
      return sanitizeStrings ? sanitizeText(value) : value
    }
    
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, depth + 1))
    }
    
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        result[sanitizeText(key)] = sanitizeValue(val, depth + 1)
      }
      return result
    }
    
    return value
  }
  
  return sanitizeValue(obj, 0) as T
}

/**
 * Valida e sanitiza um termo de busca
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return sanitizeText(input)
    // Remove caracteres especiais que podem interferir em buscas
    .replace(/[<>{}[\]|\\^~*?:]/g, '')
    // Limita tamanho
    .slice(0, 100)
}

/**
 * Verifica se uma string contém possíveis tentativas de injeção
 */
export function containsInjectionAttempt(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /union\s+select/i,
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /;\s*update\s+/i,
    /;\s*insert\s+/i,
    /--\s*$/,
    /\/\*.*\*\//,
  ]
  
  return dangerousPatterns.some(pattern => pattern.test(input))
}

/**
 * Log de tentativa de injeção para auditoria
 */
export function logInjectionAttempt(
  input: string,
  context: {
    endpoint?: string
    userId?: string
    ip?: string
  }
): void {
  console.warn('[SECURITY] Possible injection attempt detected:', {
    input: input.slice(0, 100), // Log only first 100 chars
    ...context,
    timestamp: new Date().toISOString(),
  })
}
