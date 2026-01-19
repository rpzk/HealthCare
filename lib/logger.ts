import pino from 'pino'
import { randomUUID } from 'crypto'

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

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
})

export function childLogger(ctx: Record<string, any>) {
  return logger.child(ctx)
}

export function createRequestId() {
  return randomUUID()
}
