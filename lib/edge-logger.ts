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

function print(prefix: string, args: unknown[]): void {
  // Edge runtime supports console; keep it small.
  // eslint-disable-next-line no-console
  console.log(prefix, ...args)
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) print('[DEBUG]', args)
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) print('[INFO]', args)
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) print('[WARN]', args)
  },
  error: (...args: unknown[]): void => {
    print('[ERROR]', args)
  },
}

export function createRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  try {
    if (g.crypto && typeof g.crypto.randomUUID === 'function') {
      return g.crypto.randomUUID()
    }
  } catch (e) {
    // If crypto.randomUUID unexpectedly throws, continue to fallback
    // eslint-disable-next-line no-console
    logger.debug('createRequestId crypto.randomUUID error', e)
  }
  // Fallback: pseudo-UUID (not cryptographically secure)
  const rnd = Math.random().toString(36).slice(2, 10)
  return `req_${Date.now()}_${rnd}`
}
