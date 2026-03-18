/**
 * Next.js Instrumentation Hook
 * Runs once at server startup (Node.js runtime only).
 * Registers global process-level error handlers so unhandled rejections
 * and exceptions are surfaced in logs rather than silently crashing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/logger')

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled Promise Rejection — investigate immediately')
    })

    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught Exception — process will exit')
      // Give logger a chance to flush before Node exits
      setTimeout(() => process.exit(1), 500)
    })
  }
}
