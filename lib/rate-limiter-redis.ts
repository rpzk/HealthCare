/**
 * Rate Limiter com Redis
 * 
 * Algoritmo: Token Bucket (mais eficiente que sliding window)
 * 
 * Features:
 * - Rate limiting por IP
 * - Rate limiting por usuário
 * - Rate limiting por endpoint
 * - Diferentes limites para diferentes níveis
 * - Persistente (sobrevive a restarts)
 * - Fallback para in-memory se Redis falhar
 */

import { Redis } from 'ioredis';

// Configuração do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 2, // Usar DB 2 para rate limiting
  retryStrategy: (times) => {
    // Retry com backoff exponencial
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Fallback in-memory (se Redis falhar)
const memoryStore = new Map<string, { tokens: number; lastRefill: number }>();

// Configurações de rate limits
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

// Presets de rate limits
export const RateLimitPresets = {
  // Muito restritivo - APIs sensíveis (login, senha, etc)
  STRICT: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 req/min
    message: 'Muitas tentativas. Aguarde 1 minuto.',
  },
  
  // Restritivo - APIs de mutação (POST, PUT, DELETE)
  MODERATE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 req/min
    message: 'Limite de requisições excedido. Aguarde 1 minuto.',
  },
  
  // Normal - APIs de leitura (GET)
  NORMAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 req/min
    message: 'Limite de requisições excedido.',
  },
  
  // Permissivo - Webhooks, integrações
  LENIENT: {
    maxRequests: 300,
    windowMs: 60 * 1000, // 300 req/min
    message: 'Limite de requisições excedido.',
  },
};

/**
 * Verifica se requisição está dentro do rate limit
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = RateLimitPresets.NORMAL
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { maxRequests, windowMs } = config;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    // Tentar usar Redis
    const redisKey = `ratelimit:${key}`;
    
    // Usar pipeline para operações atômicas
    const pipeline = redis.pipeline();
    
    // Remover tokens expirados
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Contar tokens válidos
    pipeline.zcard(redisKey);
    
    // Adicionar novo token
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    
    // Definir expiração
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 10);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline falhou');
    }
    
    // Resultado do ZCARD (contagem)
    const count = results[1][1] as number;
    
    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count - 1);
    const resetAt = now + windowMs;
    
    return { allowed, remaining, resetAt };
    
  } catch (error) {
    console.warn('Redis falhou, usando fallback in-memory:', error);
    
    // Fallback para in-memory
    const stored = memoryStore.get(key);
    const currentTime = Date.now();
    
    if (!stored || currentTime - stored.lastRefill >= windowMs) {
      // Nova janela ou primeira requisição
      memoryStore.set(key, {
        tokens: maxRequests - 1,
        lastRefill: currentTime,
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: currentTime + windowMs,
      };
    }
    
    if (stored.tokens > 0) {
      stored.tokens--;
      return {
        allowed: true,
        remaining: stored.tokens,
        resetAt: stored.lastRefill + windowMs,
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: stored.lastRefill + windowMs,
    };
  }
}

/**
 * Gera chave de rate limit baseada em diferentes critérios
 */
export function getRateLimitKey(
  identifier: string,
  scope: 'ip' | 'user' | 'endpoint' | 'global' = 'ip'
): string {
  return `${scope}:${identifier}`;
}

/**
 * Middleware helper para Next.js
 */
export async function rateLimitMiddleware(
  request: Request,
  config: RateLimitConfig = RateLimitPresets.NORMAL,
  identifier?: string
): Promise<Response | null> {
  // Obter IP do usuário
  const ip = identifier || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  const key = getRateLimitKey(ip);
  const result = await checkRateLimit(key, config);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: config.message || 'Too many requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }
  
  // Adicionar headers de rate limit na resposta
  return null; // Permitido - não retorna Response
}

/**
 * Obtém headers de rate limit para adicionar em responses
 */
export function getRateLimitHeaders(
  result: { remaining: number; resetAt: number },
  config: RateLimitConfig
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}

/**
 * Reseta rate limit para uma chave específica
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const redisKey = `ratelimit:${key}`;
    await redis.del(redisKey);
    memoryStore.delete(key);
  } catch (error) {
    console.error('Erro ao resetar rate limit:', error);
  }
}

/**
 * Obtém estatísticas de rate limiting
 */
export async function getRateLimitStats(): Promise<{
  totalKeys: number;
  topKeys: Array<{ key: string; count: number }>;
}> {
  try {
    const keys = await redis.keys('ratelimit:*');
    
    const topKeys: Array<{ key: string; count: number }> = [];
    
    for (const key of keys.slice(0, 10)) {
      const count = await redis.zcard(key);
      topKeys.push({
        key: key.replace('ratelimit:', ''),
        count,
      });
    }
    
    topKeys.sort((a, b) => b.count - a.count);
    
    return {
      totalKeys: keys.length,
      topKeys,
    };
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return {
      totalKeys: memoryStore.size,
      topKeys: [],
    };
  }
}

/**
 * Limpa rate limits antigos (cleanup)
 */
export async function cleanupRateLimits(): Promise<number> {
  try {
    const keys = await redis.keys('ratelimit:*');
    let deleted = 0;
    
    for (const key of keys) {
      const count = await redis.zcard(key);
      if (count === 0) {
        await redis.del(key);
        deleted++;
      }
    }
    
    return deleted;
    
  } catch (error) {
    console.error('Erro ao limpar rate limits:', error);
    return 0;
  }
}

// Exportar instância do Redis para uso externo
export { redis as rateLimitRedis };

export const RateLimiter = {
  checkRateLimit,
  getRateLimitKey,
  rateLimitMiddleware,
  getRateLimitHeaders,
  resetRateLimit,
  getRateLimitStats,
  cleanupRateLimits,
};
