import { NextResponse } from 'next/server'
import { incCounter } from '@/lib/metrics'
import { redisRateLimiter } from '@/lib/redis-integration'
import pkg from '../../../package.json'

// Evita problemas de empacotamento/árvore ao importar prisma direto neste módulo de rota
// Criamos um singleton local usando PrismaClient diretamente
let prismaSingleton: any | undefined
async function getPrisma() {
  if (!prismaSingleton) {
    const { PrismaClient } = await import('@prisma/client')
    prismaSingleton = new PrismaClient()
  }
  return prismaSingleton as { $connect: () => Promise<void>; $queryRaw: any }
}

// Garantir runtime Node.js para acesso ao Prisma/Redis, e execução dinâmica
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    // Garante conexão primeiro (retry simples se falhar por condição transitória)
    let ok = false
    for (let i=0;i<3;i++) {
      try {
        const prisma = await getPrisma()
        await prisma.$connect()
        await prisma.$queryRaw`SELECT 1`
        ok = true
        break
      } catch (inner:any) {
        if (i === 2) throw inner
        await new Promise(r=>setTimeout(r, 200 * (i+1)))
      }
    }
    if (!ok) throw new Error('db not ready')
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
  const appVersion = (pkg as any)?.version || 'dev'
  diagnostics.version = process.env.APP_VERSION || appVersion
  return NextResponse.json(diagnostics, { status: diagnostics.ok ? 200 : 503 })
}

