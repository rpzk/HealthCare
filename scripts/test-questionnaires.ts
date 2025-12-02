// Script para testar o sistema de questionários
// Execute com: npx ts-node scripts/test-questionnaires.ts

import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

async function main() {
  console.log('🧪 Testando Sistema de Questionários\n')
  
  // 1. Verificar templates existentes
  console.log('📋 1. Verificando templates existentes...')
  const templates = await prisma.questionnaireTemplate.findMany({
    include: {
      _count: {
        select: {
          categories: true
        }
      }
    }
  })
  
  if (templates.length === 0) {
    console.log('   ⚠️  Nenhum template encontrado. Execute o seed primeiro!')
    console.log('   💡 Acesse /questionnaires e clique em "Instalar Templates"')
  } else {
    console.log(`   ✅ ${templates.length} templates encontrados:`)
    templates.forEach(t => {
      console.log(`      - ${t.iconEmoji} ${t.name} (${t.therapeuticSystem})`)
    })
  }
  
  // 2. Verificar questionários enviados
  console.log('\n📤 2. Verificando questionários enviados...')
  const sentQuestionnaires = await prisma.patientQuestionnaire.findMany({
    include: {
      template: { select: { name: true } },
      patient: { select: { name: true } }
    }
  })
  
  console.log(`   📊 ${sentQuestionnaires.length} questionários enviados`)
  
  const byStatus = sentQuestionnaires.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`      - ${status}: ${count}`)
  })
  
  // 3. Verificar respostas
  console.log('\n📝 3. Verificando respostas...')
  const answers = await prisma.patientAnswer.count()
  console.log(`   📊 ${answers} respostas registradas`)
  
  // 4. Verificar análises IA
  console.log('\n🤖 4. Verificando análises IA...')
  const analyzed = await prisma.patientQuestionnaire.count({
    where: {
      aiAnalysis: { not: Prisma.JsonNull }
    }
  })
  console.log(`   🧠 ${analyzed} questionários analisados por IA`)
  
  // 5. Resumo
  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMO DO SISTEMA')
  console.log('='.repeat(50))
  console.log(`   Templates disponíveis: ${templates.length}`)
  console.log(`   Questionários enviados: ${sentQuestionnaires.length}`)
  console.log(`   Respostas coletadas: ${answers}`)
  console.log(`   Análises IA realizadas: ${analyzed}`)
  
  if (templates.length === 0) {
    console.log('\n⚡ PRÓXIMO PASSO:')
    console.log('   1. Faça login como ADMIN')
    console.log('   2. Acesse /questionnaires')
    console.log('   3. Clique em "Instalar Templates do Sistema"')
    console.log('   4. Envie um questionário para um paciente')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
