import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Rota pública de healthcheck (não requer auth)
export async function GET() {
  const started = Date.now()
  let dbOk = false
  try {
    // Consulta leve
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch (e) {
    dbOk = false
  }
  const duration = Date.now() - started
  return NextResponse.json({
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbOk ? 'up' : 'down',
    latencyMs: duration,
    version: process.env.APP_VERSION || 'dev'
  })
}
