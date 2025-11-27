/**
 * Edge-safe minimal logger for Middleware and Edge runtimes
 * Avoids Node.js built-ins and heavy logging libraries
 * 
 * In production, only warnings and errors are logged unless LOG_LEVEL is set
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const CONFIGURED_LEVEL = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined
const MIN_LEVEL = CONFIGURED_LEVEL 
  ? LOG_LEVELS[CONFIGURED_LEVEL] 
  : (IS_PRODUCTION ? LOG_LEVELS.warn : LOG_LEVELS.debug)

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL
}

export const logger = {
  debug: (...args: unknown[]) => shouldLog('debug') && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => shouldLog('info') && console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => shouldLog('warn') && console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args), // Always log errors
}

export function createRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  try {
    if (g.crypto && typeof g.crypto.randomUUID === 'function') {
      return g.crypto.randomUUID()
    }
  } catch (_) {}
  // Fallback: pseudo-UUID (not cryptographically secure)
  const rnd = Math.random().toString(36).slice(2, 10)
  return `req_${Date.now()}_${rnd}`
}
