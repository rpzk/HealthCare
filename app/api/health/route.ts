import { NextResponse } from 'next/server'
import { incCounter } from '@/lib/metrics'
import { createRedisRateLimiter } from '@/lib/redis-integration'
import { PrismaClient } from '@prisma/client'

// Direct PrismaClient instantiation to avoid bundling issues
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

const prisma = getPrismaClient()
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

  // DB check - real query
  try {
    if (!process.env.DATABASE_URL) {
      diagnostics.checks.db = { status: 'down', error: 'DATABASE_URL not set' }
      diagnostics.ok = false
    } else {
      // SELECT 1 ping (Prisma conecta lazy ao executar a query)
      let prismaRef: any = prisma as any
      if (!prismaRef) {
        const mod = await import('@prisma/client')
        prismaRef = new (mod as any).PrismaClient()
      }
      await prismaRef.$queryRaw`SELECT 1`
      diagnostics.checks.db = { status: 'up' }
    }
  } catch (err: any) {
    diagnostics.checks.db = { status: 'down', error: err?.message || String(err) }
    diagnostics.ok = false
  }

  // Redis check
  try {
    const rl = createRedisRateLimiter()
    const redisStatus = typeof rl.getStats === 'function' ? await rl.getStats() : { redisConnected: false }
    diagnostics.checks.redis = redisStatus
    if (!redisStatus.redisConnected) {
      // Não derruba o health total, mas marca como degradado
      diagnostics.checks.redis.status = 'degraded'
    }
  } catch (err: any) {
    diagnostics.checks.redis = { status: 'degraded', activeUsers: 0, mode: 'fallback' }
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