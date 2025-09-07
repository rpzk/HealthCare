import { NextResponse } from 'next/server'
import { prisma, ensurePrismaConnected } from '@/lib/prisma'
import { incCounter } from '@/lib/metrics'
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
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set')
    }
    // garante conexão primeiro (retry simples se falhar por condição transitória)
    try {
      await ensurePrismaConnected()
      await prisma.$queryRaw`SELECT 1`
    } catch (inner:any) {
      if (inner?.message?.includes('not initialised')) {
        console.warn('[health] retry ensurePrismaConnected após not initialised')
        await ensurePrismaConnected()
        await prisma.$queryRaw`SELECT 1`
      } else {
        throw inner
      }
    }
    diagnostics.checks.db = { status: 'up' }
  } catch (e: any) {
    console.error('[health][db] erro:', e?.message, e?.stack)
    incCounter('health_db_fail_total')
    diagnostics.checks.db = { status: 'down', error: e.message }
    diagnostics.ok = false
  }

  // Redis check (não crítico se ausente ou desativado via DISABLE_REDIS)
  try {
    const stats = await redisRateLimiter.getStats()
    diagnostics.checks.redis = { status: stats.redisConnected ? 'up' : 'degraded', activeUsers: stats.activeUsers, mode: process.env.DISABLE_REDIS === '1' ? 'disabled' : 'auto' }
    // Não altera diagnostics.ok se apenas Redis estiver indisponível
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

