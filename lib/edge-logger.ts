// Edge-safe minimal logger for Middleware and Edge runtimes
// Avoids Node.js built-ins and heavy logging libraries

export const logger = {
  info: (...args: any[]) => console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
}

export function createRequestId(): string {
  const g: any = globalThis as any
  try {
    if (g.crypto && typeof g.crypto.randomUUID === 'function') {
      return g.crypto.randomUUID()
    }
  } catch (_) {}
  // Fallback: pseudo-UUID (not cryptographically secure)
  const rnd = Math.random().toString(36).slice(2, 10)
  return `req_${Date.now()}_${rnd}`
}
