import Redis from 'ioredis';

// Util para throttling de logs repetidos de erro Redis
class LogThrottler {
  private lastMsg: string | null = null;
  private lastTime = 0;
  private suppressed = 0;
  constructor(private intervalMs: number = 5000) {}
  logError(prefix: string, err: any) {
    const msg = err?.message || String(err);
    const now = Date.now();
    if (this.lastMsg === msg && (now - this.lastTime) < this.intervalMs) {
      this.suppressed++;
      if (this.suppressed === 1) {
        // primeira vez que suprimimos, avisamos
        console.error(prefix + ' (repetindo, suprimindo logs por alguns segundos)');
      }
      return;
    }
    if (this.suppressed > 0) {
      console.error(`${prefix} (+${this.suppressed} repetidos suprimidos)`);
      this.suppressed = 0;
    }
    this.lastMsg = msg;
    this.lastTime = now;
    console.error(prefix, msg);
  }
}

const rateLimiterLogThrottler = new LogThrottler();
const cacheLogThrottler = new LogThrottler();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  isBlocked: boolean;
  blockUntil?: number;
}

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class RedisRateLimiter {
  private redis: Redis;
  private fallbackMemory: Map<string, RateLimitData> = new Map();
  private isRedisConnected = false;

  constructor(config?: Partial<RedisConfig>) {
    const defaultConfig: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'healthcare:ratelimit:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Suporte a REDIS_URL (prioritário) caso definido
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          keyPrefix: finalConfig.keyPrefix,
          lazyConnect: true,
          maxRetriesPerRequest: 2
        });
      } catch (e) {
        console.error('❌ Erro ao parsear REDIS_URL, fallback para host/port:', e);
        this.redis = new Redis({
          host: finalConfig.host,
          port: finalConfig.port,
          password: finalConfig.password,
          db: finalConfig.db,
          keyPrefix: finalConfig.keyPrefix,
          maxRetriesPerRequest: 2,
          lazyConnect: true
        });
      }
    } else {
      this.redis = new Redis({
        host: finalConfig.host,
        port: finalConfig.port,
        password: finalConfig.password,
        db: finalConfig.db,
        keyPrefix: finalConfig.keyPrefix,
        maxRetriesPerRequest: 2,
        lazyConnect: true
      });
    }

    if (process.env.DISABLE_REDIS === '1') {
      console.log('🔕 Redis desativado via DISABLE_REDIS=1 (usando apenas fallback em memória)')
    } else {
      this.setupRedisEventHandlers();
      this.initializeConnection();
    }
  }

  /**
   * 🔌 Configura handlers de eventos do Redis
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('🔴 Redis conectado para rate limiting');
      this.isRedisConnected = true;
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis pronto para operações de rate limiting');
    });

    this.redis.on('error', (error) => {
      rateLimiterLogThrottler.logError('❌ Erro no Redis rate limiter:', error);
      this.isRedisConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Conexão Redis fechada, usando fallback');
      this.isRedisConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Reconectando ao Redis...');
    });
  }

  /**
   * 🚀 Inicializa conexão com Redis
   */
  private async initializeConnection(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error: any) {
      rateLimiterLogThrottler.logError('❌ Falha na conexão inicial do Redis:', error);
      this.isRedisConnected = false;
      // Fallback rápido: se host padrão "redis" e falhou DNS ou timeout, tenta localhost 1x
      const hostTried = (this.redis as any).options?.host;
      if (hostTried === 'redis' || hostTried === 'redis-cache') {
        try {
          console.log('🔁 Tentando fallback para localhost:6379 (rate limiter)');
          this.redis.disconnect();
          this.redis = new Redis({
            host: 'localhost',
            port: 6379,
            db: parseInt(process.env.REDIS_DB || '0'),
            keyPrefix: 'healthcare:ratelimit:',
            maxRetriesPerRequest: 2,
            lazyConnect: true
          });
          this.setupRedisEventHandlers();
          await this.redis.connect();
        } catch (e2) {
          rateLimiterLogThrottler.logError('❌ Fallback localhost falhou (rate limiter):', e2);
        }
      }
    }
  }

  /**
   * ⚡ Verifica e incrementa rate limit (operação atômica)
   */
  async checkRateLimit(
    userId: string, 
    limit: number, 
    windowMs: number,
    blockDurationMs: number = 60000
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
    retryAfter?: number;
  }> {
    const key = `user:${userId}`;
    const now = Date.now();

    if (this.isRedisConnected) {
      try {
        return await this.checkRateLimitRedis(key, limit, windowMs, blockDurationMs, now);
      } catch (error) {
        console.error('❌ Erro no Redis rate limit, usando fallback:', error);
        this.isRedisConnected = false;
      }
    }

    // 🔄 Fallback para memória quando Redis não está disponível
    return this.checkRateLimitMemory(key, limit, windowMs, blockDurationMs, now);
  }

  /**
   * 🔴 Implementação Redis com operação atômica Lua
   */
  private async checkRateLimitRedis(
    key: string,
    limit: number,
    windowMs: number,
    blockDurationMs: number,
    now: number
  ): Promise<any> {
    // 🚀 Script Lua para operação atômica - evita race conditions
    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local blockDuration = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      -- Verificar se está bloqueado
      local blockKey = key .. ":blocked"
      local blockUntil = redis.call('GET', blockKey)
      if blockUntil and tonumber(blockUntil) > now then
        local retryAfter = math.ceil((tonumber(blockUntil) - now) / 1000)
        return {0, limit, 0, tonumber(blockUntil), 1, retryAfter}
      end
      
      -- Limpar bloqueio expirado
      if blockUntil then
        redis.call('DEL', blockKey)
      end
      
      -- Gerenciar janela deslizante
      local countKey = key .. ":count"
      local resetKey = key .. ":reset"
      
      local currentCount = redis.call('GET', countKey)
      local resetTime = redis.call('GET', resetKey)
      
      if not currentCount or not resetTime or tonumber(resetTime) <= now then
        -- Nova janela
        currentCount = 1
        resetTime = now + window
        redis.call('SET', countKey, currentCount)
        redis.call('SET', resetKey, resetTime)
        redis.call('EXPIRE', countKey, math.ceil(window / 1000))
        redis.call('EXPIRE', resetKey, math.ceil(window / 1000))
        
        return {1, limit, limit - currentCount, resetTime, 0}
      else
        -- Incrementar contador existente
        currentCount = tonumber(currentCount) + 1
        redis.call('SET', countKey, currentCount)
        
        -- Verificar se excedeu o limite
        if currentCount > limit then
          -- Bloquear usuário
          local blockUntil = now + blockDuration
          redis.call('SET', blockKey, blockUntil)
          redis.call('EXPIRE', blockKey, math.ceil(blockDuration / 1000))
          
          local retryAfter = math.ceil(blockDuration / 1000)
          return {0, limit, 0, blockUntil, 1, retryAfter}
        end
        
        return {1, limit, limit - currentCount, tonumber(resetTime), 0}
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      limit.toString(),
      windowMs.toString(),
      blockDurationMs.toString(),
      now.toString()
    ) as number[];

    return {
      allowed: result[0] === 1,
      limit,
      remaining: result[2],
      resetTime: result[3],
      isBlocked: result[4] === 1,
      retryAfter: result[5]
    };
  }

  /**
   * 💾 Fallback em memória quando Redis não está disponível
   */
  private checkRateLimitMemory(
    key: string,
    limit: number,
    windowMs: number,
    blockDurationMs: number,
    now: number
  ): any {
    let data = this.fallbackMemory.get(key);

    // Verificar se está bloqueado
    if (data?.isBlocked && data.blockUntil && data.blockUntil > now) {
      const retryAfter = Math.ceil((data.blockUntil - now) / 1000);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: data.blockUntil,
        isBlocked: true,
        retryAfter
      };
    }

    // Reset se a janela expirou ou primeira vez
    if (!data || data.resetTime <= now) {
      data = {
        count: 1,
        resetTime: now + windowMs,
        isBlocked: false
      };
      this.fallbackMemory.set(key, data);
      
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime: data.resetTime,
        isBlocked: false
      };
    }

    // Incrementar contador
    data.count++;

    // Verificar se excedeu o limite
    if (data.count > limit) {
      data.isBlocked = true;
      data.blockUntil = now + blockDurationMs;
      this.fallbackMemory.set(key, data);

      const retryAfter = Math.ceil(blockDurationMs / 1000);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: data.blockUntil,
        isBlocked: true,
        retryAfter
      };
    }

    this.fallbackMemory.set(key, data);

    return {
      allowed: true,
      limit,
      remaining: limit - data.count,
      resetTime: data.resetTime,
      isBlocked: false
    };
  }

  /**
   * 🔄 Reset manual de rate limit para um usuário
   */
  async resetRateLimit(userId: string): Promise<void> {
    const key = `user:${userId}`;

    if (this.isRedisConnected) {
      try {
        await Promise.all([
          this.redis.del(`${key}:count`),
          this.redis.del(`${key}:reset`),
          this.redis.del(`${key}:blocked`)
        ]);
        return;
      } catch (error) {
        console.error('❌ Erro ao resetar no Redis:', error);
      }
    }

    // Fallback para memória
    this.fallbackMemory.delete(key);
  }

  /**
   * 📊 Obtém estatísticas detalhadas de rate limiting
   */
  async getStats(): Promise<{
    redisConnected: boolean;
    totalKeys: number;
    activeUsers: number;
    blockedUsers: number;
    memoryFallbackEntries: number;
  }> {
    let totalKeys = 0;
    let activeUsers = 0;
    let blockedUsers = 0;

    if (this.isRedisConnected) {
      try {
        const keys = await this.redis.keys('*');
        totalKeys = keys.length;
        
        const userKeys = keys.filter(k => k.includes(':count'));
        activeUsers = userKeys.length;
        
        const blockedKeys = keys.filter(k => k.includes(':blocked'));
        blockedUsers = blockedKeys.length;
      } catch (error) {
        console.error('❌ Erro ao obter stats do Redis:', error);
      }
    }

    return {
      redisConnected: this.isRedisConnected,
      totalKeys,
      activeUsers,
      blockedUsers,
      memoryFallbackEntries: this.fallbackMemory.size
    };
  }

  /**
   * 🧹 Limpeza de entradas antigas (apenas para fallback em memória)
   */
  cleanup(): void {
    const now = Date.now();
    
    Array.from(this.fallbackMemory.entries()).forEach(([key, data]) => {
      // Remover entradas expiradas
      if (data.resetTime < now && (!data.blockUntil || data.blockUntil < now)) {
        this.fallbackMemory.delete(key);
      }
    });
  }

  /**
   * 🔌 Fecha conexão Redis
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

/**
 * 🌐 Sistema de Cache Distribuído Redis
 */
export class RedisCache {
  private redis: Redis;
  private fallbackMemory: Map<string, CacheItem<any>> = new Map();
  private isRedisConnected = false;

  constructor(config?: Partial<RedisConfig>) {
    const defaultConfig: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
      keyPrefix: 'healthcare:cache:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          keyPrefix: finalConfig.keyPrefix,
          lazyConnect: true
        });
      } catch (e) {
        console.error('❌ Erro ao parsear REDIS_URL (cache), fallback host/port:', e);
        this.redis = new Redis({
          host: finalConfig.host,
          port: finalConfig.port,
          password: finalConfig.password,
          db: finalConfig.db,
          keyPrefix: finalConfig.keyPrefix,
          lazyConnect: true
        });
      }
    } else {
      this.redis = new Redis({
        host: finalConfig.host,
        port: finalConfig.port,
        password: finalConfig.password,
        db: finalConfig.db,
        keyPrefix: finalConfig.keyPrefix,
        lazyConnect: true
      });
    }

    if (process.env.DISABLE_REDIS === '1') {
      console.log('🔕 Redis Cache desativado via DISABLE_REDIS=1 (fallback memória)')
    } else {
      this.setupEventHandlers();
      this.initializeConnection();
    }
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      console.log('🔴 Redis Cache conectado');
    });

    this.redis.on('error', (error) => {
      cacheLogThrottler.logError('❌ Erro no Redis Cache:', error);
      this.isRedisConnected = false;
    });
  }

  private async initializeConnection(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error: any) {
      cacheLogThrottler.logError('❌ Falha na conexão Redis Cache:', error);
      this.isRedisConnected = false;
      const hostTried = (this.redis as any).options?.host;
      if (hostTried === 'redis' || hostTried === 'redis-cache') {
        try {
          console.log('🔁 Tentando fallback para localhost:6379 (cache)');
          this.redis.disconnect();
          this.redis = new Redis({
            host: 'localhost',
            port: 6379,
            db: parseInt(process.env.REDIS_CACHE_DB || '1'),
            keyPrefix: 'healthcare:cache:',
            lazyConnect: true
          });
          this.setupEventHandlers();
          await this.redis.connect();
        } catch (e2) {
          cacheLogThrottler.logError('❌ Fallback localhost falhou (cache):', e2);
        }
      }
    }
  }

  /**
   * 💾 Armazena item no cache
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisConnected) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.error('❌ Erro ao salvar no Redis Cache:', error);
      }
    }

    // Fallback para memória
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.fallbackMemory.set(key, { data: value, expiry });
  }

  /**
   * 📖 Recupera item do cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('❌ Erro ao ler do Redis Cache:', error);
      }
    }

    // Fallback para memória
    const item = this.fallbackMemory.get(key);
    if (item && item.expiry > Date.now()) {
      return item.data;
    }

    // Remover item expirado
    if (item) {
      this.fallbackMemory.delete(key);
    }

    return null;
  }

  /**
   * 🗑️ Remove item do cache
   */
  async delete(key: string): Promise<void> {
    if (this.isRedisConnected) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('❌ Erro ao deletar do Redis Cache:', error);
      }
    }

    this.fallbackMemory.delete(key);
  }

  /**
   * 🧹 Limpeza de cache expirado (apenas fallback)
   */
  cleanup(): void {
    const now = Date.now();
    Array.from(this.fallbackMemory.entries()).forEach(([key, item]) => {
      if (item.expiry < now) {
        this.fallbackMemory.delete(key);
      }
    });
  }
}

// 🌟 Instâncias singleton
// Note: avoid creating connections during module evaluation so Next.js build/prerender doesn't
// attempt to connect to Redis (which can fail in CI or during static export). Provide
// factory/getter functions that create singletons on demand at runtime.
let _redisRateLimiter: RedisRateLimiter | null = null;
let _redisCache: RedisCache | null = null;

export function getRedisRateLimiter(): RedisRateLimiter {
  if (!_redisRateLimiter) {
    _redisRateLimiter = new RedisRateLimiter();
  }
  return _redisRateLimiter;
}

export function getRedisCache(): RedisCache {
  if (!_redisCache) {
    _redisCache = new RedisCache();
  }
  return _redisCache;
}

// Helper para expor estatísticas do cache Redis (uso interno no dashboard)
export async function getRedisCacheStats() {
  const cache = _redisCache || null;
  const isConnected = !!(cache && (cache as any).isRedisConnected);
  const memoryFallbackEntries = cache && (cache as any).fallbackMemory ? (cache as any).fallbackMemory.size : 0;
  return {
    redisConnected: isConnected,
    memoryFallbackEntries
  };
}

export async function getRedisCombinedStats() {
  const rl = _redisRateLimiter ? await _redisRateLimiter.getStats() : { redisConnected: false, totalKeys: 0, activeUsers:0, blockedUsers:0, memoryFallbackEntries: 0 };
  const cache = await getRedisCacheStats();
  return { rateLimiter: rl, cache };
}

// Start a background cleanup only when singletons are created at runtime
function startBackgroundCleanupIfNeeded() {
  if (_redisRateLimiter || _redisCache) {
    // If already started, don't create another interval (simple guard)
    if ((global as any).__healthcare_redis_cleanup_started) return;
    (global as any).__healthcare_redis_cleanup_started = true;
    setInterval(() => {
      try {
        _redisRateLimiter?.cleanup();
        _redisCache?.cleanup();
      } catch (e) {
        console.error('Erro durante limpeza periódica do Redis:', e);
      }
    }, 10 * 60 * 1000);
  }
}

// Wrap factory to start cleanup when created
const originalGetRedisRateLimiter = getRedisRateLimiter;
const originalGetRedisCache = getRedisCache;
export function createRedisRateLimiter() {
  const rl = originalGetRedisRateLimiter();
  startBackgroundCleanupIfNeeded();
  return rl;
}

export function createRedisCache() {
  const c = originalGetRedisCache();
  startBackgroundCleanupIfNeeded();
  return c;
}
