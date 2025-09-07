// Captura erros globais para diagnosticar quedas inesperadas no CI
if (!(global as any).__errorHooksInstalled) {
  (global as any).__errorHooksInstalled = true
  process.on('unhandledRejection', (reason:any) => {
    console.error('[global] UnhandledRejection:', reason?.message || reason, reason?.stack)
  })
  process.on('uncaughtException', (err:any) => {
    console.error('[global] UncaughtException:', err.message, err.stack)
  })
  process.on('exit', (code) => {
    if (code !== 0) {
      console.error('[global] Process exiting with code', code)
    }
  })
}
