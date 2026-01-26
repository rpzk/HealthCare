import pino from 'pino'
import { randomUUID } from 'crypto'

// In production, only log warnings and errors unless LOG_LEVEL is explicitly set
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')

export const logger = pino({
  level,
  base: undefined, // não incluir pid/hostname por simplificação
  redact: {
    paths: ['req.headers.authorization', 'user.password', 'patient.cpf'],
    censor: '[REDACTED]'
  },
  formatters: {
    level(label) {
      return { level: label }
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
}) as unknown as Omit<pino.Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'> & {
  trace: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  fatal: (...args: unknown[]) => void
}

export function childLogger(ctx: Record<string, unknown>) {
  return logger.child(ctx) as typeof logger
}

export function createRequestId() {
  return randomUUID()
}
