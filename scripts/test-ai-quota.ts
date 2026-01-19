// Teste de quota de IA: valida erro ao exceder limite diário para symptom_analysis
import { prisma } from '@/lib/prisma'
import { checkAndConsumeAIQuota } from '@/lib/ai-quota'

async function main(){
  const email = 'quota-user@example.com'
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Quota User', role: 'DOCTOR' }
  })
  const userId = user.id
  const type = 'symptom_analysis'
  let ok = true
  let errorTriggered = false
  // Limite default: 50 -> chamar 51 vezes e esperar erro na 51ª
  for (let i=1;i<=51;i++) {
    try {
      await checkAndConsumeAIQuota(userId, type)
      if (i===51) {
        console.error('[ai-quota-test] Esperava erro na chamada 51, mas não ocorreu')
        ok = false
      }
    } catch(e:any) {
      if (i<=50) {
        console.error('[ai-quota-test] Erro prematuro na chamada', i, e.message)
        ok = false
        break
      } else {
        if (e.message.includes('Limite diário')) {
          errorTriggered = true
          console.log('[ai-quota-test] Erro de quota corretamente disparado na chamada', i)
        } else {
          console.error('[ai-quota-test] Mensagem inesperada:', e.message)
          ok = false
        }
      }
    }
  }
  if (!errorTriggered) ok = false
  if (!ok) {
    console.error('[ai-quota-test] TEST FAILED')
    process.exit(1)
  } else {
    console.log('[ai-quota-test] TEST PASSED')
  }
  await prisma.$disconnect()
}

main().catch(e=>{ console.error('[ai-quota-test] Erro geral', e); process.exit(1) })
