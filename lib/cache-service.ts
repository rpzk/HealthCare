/**
 * Simple In-Memory Cache Service
 * Para dados frequentemente acessados que não mudam com frequência
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class CacheService {
  private static store = new Map<string, CacheEntry<unknown>>()
  private static readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Obtém um valor do cache ou executa a função e cacheia o resultado
   */
  static async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const value = await fn()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * Obtém um valor do cache
   */
  static get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    
    if (!entry) {
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.data
  }

  /**
   * Define um valor no cache
   */
  static set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Remove um valor do cache
   */
  static delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Remove valores que começam com um prefixo
   */
  static deleteByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Limpa todo o cache
   */
  static clear(): void {
    this.store.clear()
  }

  /**
   * Remove entradas expiradas
   */
  static cleanup(): number {
    const now = Date.now()
    let count = 0
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        count++
      }
    }
    
    return count
  }

  /**
   * Estatísticas do cache
   */
  static stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    }
  }
}

// Cache keys para diferentes recursos
export const CacheKeys = {
  // Códigos médicos (CID, CBO, etc.) - raramente mudam
  medicalCodes: (system: string) => `codes:${system}`,
  codeSearch: (system: string, query: string) => `codes:${system}:search:${query}`,
  
  // Medicamentos - cache curto
  medicationSearch: (query: string) => `meds:search:${query}`,
  medicationList: (page: number) => `meds:list:${page}`,
  
  // Exames disponíveis
  examTypes: () => 'exams:types',
  
  // Estatísticas de dashboard - cache curto
  dashboardStats: (userId: string) => `dashboard:${userId}`,
  
  // Protocolos clínicos
  protocols: (category?: string) => category ? `protocols:${category}` : 'protocols:all',
  
  // Sistema
  systemSettings: () => 'system:settings',
} as const

// TTLs em milissegundos
export const CacheTTL = {
  SHORT: 30 * 1000,        // 30 segundos
  MEDIUM: 5 * 60 * 1000,   // 5 minutos
  LONG: 30 * 60 * 1000,    // 30 minutos
  VERY_LONG: 60 * 60 * 1000, // 1 hora
} as const

export { CacheService }
