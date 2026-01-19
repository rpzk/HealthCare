import { NextResponse } from 'next/server'
import { incCounter } from '@/lib/metrics'
import { createRedisRateLimiter } from '@/lib/redis-integration'
import pkg from '../../../package.json'

// Garantir runtime Node.js para acesso ao Redis, e execução dinâmica
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Rota pública de healthcheck (não requer auth)
export async function GET() {
  const started = Date.now()
  const diagnostics: any = {
    checks: {},
    ok: true
  }

  // DB check - Mock para desenvolvimento
  try {
    if (!process.env.DATABASE_URL) {
      diagnostics.checks.db = { status: 'down', error: 'DATABASE_URL not set' }
      diagnostics.ok = false
    } else {
      // Simular verificação de banco (mock)
      diagnostics.checks.db = { status: 'up', mode: 'mock' }
    }
  } catch (err: any) {
    diagnostics.checks.db = { status: 'down', error: err.message }
    diagnostics.ok = false
  }

  // Redis check
  try {
    const rl = createRedisRateLimiter()
    // getStats provides a richer view; adapt if older helper existed
    const redisStatus = typeof rl.getStats === 'function' ? await rl.getStats() : { redisConnected: false }
    diagnostics.checks.redis = redisStatus
  } catch (err: any) {
    diagnostics.checks.redis = { status: 'degraded', activeUsers: 0, mode: 'auto' }
  }

  // Metrics
  try {
    incCounter('health_check')
  } catch (err) {
    // Ignore metrics errors
  }

  const latencyMs = Date.now() - started
  const uptimeSeconds = Math.floor(process.uptime())

  return NextResponse.json({
    ...diagnostics,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    latencyMs,
    version: pkg.version || '1.0.0'
  }, {
    status: diagnostics.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}