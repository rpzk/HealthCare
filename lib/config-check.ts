import { incCounter } from './metrics'
import { logger } from '@/lib/logger'

// Lista de variáveis obrigatórias em produção
const REQUIRED_VARS = [
  'NEXTAUTH_SECRET'
]

let executed = false
export function verifyConfig(){
  if (executed) return
  executed = true
  const missing: string[] = []
  for (const v of REQUIRED_VARS){
    if (!process.env[v]) missing.push(v)
  }
  if (missing.length){
    for (const v of missing) incCounter('config_missing_total', { var: v })
    if (process.env.CI){
      // Em CI apenas registra sem quebrar build
      logger.warn('[config-check] Variáveis ausentes:', missing.join(','))
    } else {
      logger.warn('[config-check] Variáveis ausentes (continuando em dev):', missing.join(','))
    }
  }
}
