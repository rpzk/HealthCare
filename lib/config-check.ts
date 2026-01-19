import { incCounter } from './metrics'

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
      console.warn('[config-check] Variáveis ausentes:', missing.join(','))
    } else {
      console.warn('[config-check] Variáveis ausentes (continuando em dev):', missing.join(','))
    }
  }
}
