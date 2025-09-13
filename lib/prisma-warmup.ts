import { incCounter, setGauge } from './metrics'

// Evita executar warmup em contextos indevidos (build/edge/test)
const isNode = typeof process !== 'undefined' && process.versions?.node
const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.BUILD_TIME === '1'
const isEdge = (globalThis as any).EdgeRuntime === 'edge'

let prismaRef: any | undefined
async function getPrisma() {
  if (!prismaRef) {
    const { PrismaClient } = await import('@prisma/client')
    prismaRef = new PrismaClient()
  }
  return prismaRef as { $connect: () => Promise<void>; $queryRaw: any }
}

let started = false
export async function warmupPrisma(retries: number = 5) {
  if (started) return
  started = true
  const start = Date.now()
  for (let i=0;i<retries;i++) {
    try {
      const prisma = await getPrisma()
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      incCounter('prisma_warmup_success_total')
      setGauge('prisma_warmup_last_ms', Date.now()-start)
      return
    } catch (e:any) {
      incCounter('prisma_warmup_fail_total', { attempt: String(i+1) })
      if (i === retries-1) {
        console.error('[prisma-warmup] Falha final:', e.message)
      } else {
        const backoff = 200 * Math.pow(2,i)
        await new Promise(r=>setTimeout(r, backoff))
      }
    }
  }
}

// Dispara em background; não bloqueia render inicial – somente em Node runtime real
if (isNode && !isTest && !isBuild && !isEdge) {
  warmupPrisma().catch(()=>{})
}
