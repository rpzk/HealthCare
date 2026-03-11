import type RedisType from 'ioredis'
import { logger } from '@/lib/logger'

async function loadRedis(): Promise<typeof import('ioredis').default> {
  return (await import('ioredis')).default
}

// Util para throttling de logs repetidos de erro Redis
class LogThrottler {
  private lastMsg: string | null = null;
  private lastTime = 0;
  private suppressed = 0;
  constructor(private intervalMs: number = 5000) {}
  logError(prefix: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const now = Date.now();
    if (this.lastMsg === msg && (now - this.lastTime) < this.intervalMs) {
      this.suppressed++;
      if (this.suppressed === 1) {
        // primeira vez que suprimimos, avisamos
        logger.error(prefix + ' (repetindo, suprimindo logs por alguns segundos)');
      }
      return;
    }
    if (this.suppressed > 0) {
      logger.error(`${prefix} (+${this.suppressed} repetidos suprimidos)`);
      this.suppressed = 0;
    }
    this.lastMsg = msg;
    this.lastTime = now;
    logger.error(prefix, msg);
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

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  retryAfter?: number;
}

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class RedisRateLimiter {
  private redis: RedisType | null = null;
  private fallbackMemory: Map<string, RateLimitData> = new Map();
  private isRedisConnected = false;
  private config: RedisConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<RedisConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'healthcare:ratelimit:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      ...config
    };

    if (process.env.DISABLE_REDIS !== '1') {
      this.initPromise = this.initializeConnection();
    }
  }

  private async createRedisClient(): Promise<RedisType> {
    const Redis = await loadRedis();
    let client: RedisType;

    if (process.env.REDIS_URL) {
      try {
        client = new Redis(process.env.REDIS_URL, {
          keyPrefix: this.config.keyPrefix,
          lazyConnect: true,
          maxRetriesPerRequest: 2
        });
      } catch (e) {
        logger.error('Erro ao parsear REDIS_URL, fallback para host/port:', e);
        client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          maxRetriesPerRequest: 2,
          lazyConnect: true
        });
      }
    } else {
      client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: 2,
        lazyConnect: true
      });
    }

    client.on('error', (err: NodeJS.ErrnoException) => {
      if (err?.code === 'ECONNREFUSED') return;
      logger.error('Redis Client Error:', err);
    });

    return client;
  }

  private setupRedisEventHandlers(): void {
    if (!this.redis) return;
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
    });
    this.redis.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        this.isRedisConnected = false;
        return;
      }
      rateLimiterLogThrottler.logError('Erro no Redis rate limiter:', error);
      this.isRedisConnected = false;
    });
    this.redis.on('close', () => { this.isRedisConnected = false; });
  }

  private async initializeConnection(): Promise<void> {
    try {
      this.redis = await this.createRedisClient();
      this.setupRedisEventHandlers();
      await this.redis.connect();
      this.isRedisConnected = true;
    } catch (error) {
      rateLimiterLogThrottler.logError('Falha na conexão inicial do Redis:', error);
      this.isRedisConnected = false;
      const hostTried = this.config.host;
      if (hostTried === 'redis' || hostTried === 'redis-cache') {
        try {
          const Redis = await loadRedis();
          this.redis?.disconnect();
          this.redis = new Redis({
            host: 'localhost', port: 6379,
            db: this.config.db, keyPrefix: this.config.keyPrefix,
            maxRetriesPerRequest: 2, lazyConnect: true
          });
          this.setupRedisEventHandlers();
          await this.redis.connect();
          this.isRedisConnected = true;
        } catch (e2) {
          rateLimiterLogThrottler.logError('Fallback localhost falhou (rate limiter):', e2);
        }
      }
    }
  }

  private async ensureInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

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
    await this.ensureInit();
    const key = `user:${userId}`;
    const now = Date.now();

    if (this.isRedisConnected && this.redis) {
      try {
        return await this.checkRateLimitRedis(key, limit, windowMs, blockDurationMs, now);
      } catch (error) {
        logger.error('❌ Erro no Redis rate limit, usando fallback:', error);
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
  ): Promise<RateLimitResult> {
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

    const result = await this.redis!.eval(
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
  ): RateLimitResult {
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
    await this.ensureInit();
    const key = `user:${userId}`;

    if (this.isRedisConnected && this.redis) {
      try {
        await Promise.all([
          this.redis.del(`${key}:count`),
          this.redis.del(`${key}:reset`),
          this.redis.del(`${key}:blocked`)
        ]);
        return;
      } catch (error) {
        logger.error('❌ Erro ao resetar no Redis:', error);
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

    if (this.isRedisConnected && this.redis) {
      try {
        const keys = await this.redis.keys('*');
        totalKeys = keys.length;
        
        const userKeys = keys.filter(k => k.includes(':count'));
        activeUsers = userKeys.length;
        
        const blockedKeys = keys.filter(k => k.includes(':blocked'));
        blockedUsers = blockedKeys.length;
      } catch (error) {
        logger.error('❌ Erro ao obter stats do Redis:', error);
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
    this.redis?.disconnect();
  }
}

/**
 * 🌐 Sistema de Cache Distribuído Redis
 */
export class RedisCache {
  private redis: RedisType | null = null;
  private fallbackMemory: Map<string, CacheItem<unknown>> = new Map();
  private isRedisConnected = false;
  private config: RedisConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<RedisConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
      keyPrefix: 'healthcare:cache:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      ...config
    };

    if (process.env.DISABLE_REDIS !== '1') {
      this.initPromise = this.initializeConnection();
    }
  }

  private async ensureInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;
    this.redis.on('connect', () => { this.isRedisConnected = true; });
    this.redis.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        this.isRedisConnected = false;
        return;
      }
      cacheLogThrottler.logError('Erro no Redis Cache:', error);
      this.isRedisConnected = false;
    });
  }

  private async initializeConnection(): Promise<void> {
    try {
      const Redis = await loadRedis();
      if (process.env.REDIS_URL) {
        try {
          this.redis = new Redis(process.env.REDIS_URL, {
            keyPrefix: this.config.keyPrefix, lazyConnect: true
          });
        } catch {
          this.redis = new Redis({
            host: this.config.host, port: this.config.port,
            password: this.config.password, db: this.config.db,
            keyPrefix: this.config.keyPrefix, lazyConnect: true
          });
        }
      } else {
        this.redis = new Redis({
          host: this.config.host, port: this.config.port,
          password: this.config.password, db: this.config.db,
          keyPrefix: this.config.keyPrefix, lazyConnect: true
        });
      }
      this.redis.on('error', (err: NodeJS.ErrnoException) => {
        if (err?.code === 'ECONNREFUSED') return;
      });
      this.setupEventHandlers();
      await this.redis.connect();
      this.isRedisConnected = true;
    } catch (error) {
      cacheLogThrottler.logError('Falha na conexão Redis Cache:', error);
      this.isRedisConnected = false;
      if (this.config.host === 'redis' || this.config.host === 'redis-cache') {
        try {
          const Redis = await loadRedis();
          this.redis?.disconnect();
          this.redis = new Redis({
            host: 'localhost', port: 6379,
            db: this.config.db, keyPrefix: this.config.keyPrefix, lazyConnect: true
          });
          this.setupEventHandlers();
          await this.redis.connect();
          this.isRedisConnected = true;
        } catch (e2) {
          cacheLogThrottler.logError('Fallback localhost falhou (cache):', e2);
        }
      }
    }
  }

  /**
   * 💾 Armazena item no cache
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.ensureInit();
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        logger.error('❌ Erro ao salvar no Redis Cache:', error);
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
    await this.ensureInit();
    if (this.isRedisConnected && this.redis) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.error('❌ Erro ao ler do Redis Cache:', error);
      }
    }

    // Fallback para memória
    const item = this.fallbackMemory.get(key);
    if (item && item.expiry > Date.now()) {
    return item.data as T;
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
    await this.ensureInit();
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error('❌ Erro ao deletar do Redis Cache:', error);
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
  // Access internal cache info safely without using `any` so lint stays clean
  const cacheInfo = cache as unknown as { isRedisConnected?: boolean; fallbackMemory?: Map<string, unknown> } | null;
  const isConnected = !!(cacheInfo && cacheInfo.isRedisConnected);
  const memoryFallbackEntries = cacheInfo && cacheInfo.fallbackMemory ? cacheInfo.fallbackMemory.size : 0;
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
    const globalWithCleanup = global as typeof globalThis & { __healthcare_redis_cleanup_started?: boolean };
    if (globalWithCleanup.__healthcare_redis_cleanup_started) return;
    globalWithCleanup.__healthcare_redis_cleanup_started = true;
    setInterval(() => {
      try {
        _redisRateLimiter?.cleanup();
        _redisCache?.cleanup();
      } catch (e) {
        logger.error('Erro durante limpeza periódica do Redis:', e);
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
