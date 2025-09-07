import { prisma } from './prisma'
import { incCounter, setGauge } from './metrics'

let started = false
export async function warmupPrisma(retries: number = 5) {
  if (started) return
  started = true
  const start = Date.now()
  for (let i=0;i<retries;i++) {
    try {
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

// Dispara em background; não bloqueia render inicial.
warmupPrisma().catch(()=>{})
