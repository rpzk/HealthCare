// Captura erros globais para diagnosticar quedas inesperadas no CI
const globalWithHooks = global as typeof globalThis & { __errorHooksInstalled?: boolean }
if (!globalWithHooks.__errorHooksInstalled) {
  globalWithHooks.__errorHooksInstalled = true
  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason as Error | undefined
    console.error('[global] UnhandledRejection:', err?.message || reason, err?.stack)
  })
  process.on('uncaughtException', (err: Error) => {
    console.error('[global] UncaughtException:', err.message, err.stack)
  })
  process.on('exit', (code) => {
    if (code !== 0) {
      console.error('[global] Process exiting with code', code)
    }
  })
}
