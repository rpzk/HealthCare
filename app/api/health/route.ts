import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redisRateLimiter } from '@/lib/redis-integration'
import { version } from '../../../package.json'

// Rota pública de healthcheck (não requer auth)
export async function GET() {
  const started = Date.now()
  const diagnostics: any = {
    checks: {},
    ok: true
  }
  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`
    diagnostics.checks.db = { status: 'up' }
  } catch (e: any) {
    diagnostics.checks.db = { status: 'down', error: e.message }
    diagnostics.ok = false
  }

  // Redis check (não crítico se ausente)
  try {
    const stats = await redisRateLimiter.getStats()
    diagnostics.checks.redis = { status: stats.redisConnected ? 'up' : 'down', activeUsers: stats.activeUsers }
    if (!stats.redisConnected) diagnostics.ok = false
  } catch (e: any) {
    diagnostics.checks.redis = { status: 'down', error: e.message }
    // Redis não crítico: não altera diagnostics.ok
  }

  diagnostics.uptimeSeconds = Math.floor(process.uptime())
  diagnostics.timestamp = new Date().toISOString()
  diagnostics.latencyMs = Date.now() - started
  diagnostics.version = process.env.APP_VERSION || version || 'dev'
  return NextResponse.json(diagnostics, { status: diagnostics.ok ? 200 : 503 })
}

