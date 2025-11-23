// Global instrumentation to capture crashes in both Node and Edge runtimes
export async function register() {
  try {
    // Guard against double registration
    if ((globalThis as any).__hcInstr) return
    ;(globalThis as any).__hcInstr = true

    const isNode = typeof process !== 'undefined' && typeof (process as any).on === 'function'
    const hasAddEvent = typeof (globalThis as any).addEventListener === 'function'

    if (isNode) {
      process.on('unhandledRejection', (reason: any) => {
        // eslint-disable-next-line no-console
        console.error('[instr] UnhandledRejection:', reason?.message || reason, reason?.stack)
      })
      process.on('uncaughtException', (err: any) => {
        // eslint-disable-next-line no-console
        console.error('[instr] UncaughtException:', err?.message, err?.stack)
      })
      process.on('exit', (code: number) => {
        if (code !== 0) {
          // eslint-disable-next-line no-console
          console.error('[instr] Process exiting with code', code)
        }
      })
      // eslint-disable-next-line no-console
      console.log('[instr] Global instrumentation registered (node)')
      return
    }

    // Edge/Browser-like runtime
    if (hasAddEvent) {
      try {
        ;(globalThis as any).addEventListener('unhandledrejection', (event: any) => {
          // eslint-disable-next-line no-console
          console.error('[instr] UnhandledRejection (edge):', event?.reason?.message || event?.reason || event)
        })
      } catch {}
      try {
        ;(globalThis as any).addEventListener('error', (event: any) => {
          // eslint-disable-next-line no-console
          console.error('[instr] Error (edge):', event?.message || event)
        })
      } catch {}
      // eslint-disable-next-line no-console
      console.log('[instr] Global instrumentation registered (edge)')
      return
    }

    // Fallback: do nothing quietly
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[instr] Failed to register instrumentation:', (e as any)?.message)
  }
}
