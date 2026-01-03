import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Normaliza um nome: primeira letra de cada palavra em maiúscula
 */
function normalizeName(name: string): string {
  if (!name) return ''
  
  return name
    .trim()
    .split(' ')
    .map((word, index) => {
      if (word.length === 0) return ''
      
      // Exceções para preposições e artigos comuns (exceto se for a primeira palavra)
      const lowercase = ['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os']
      if (index > 0 && lowercase.includes(word.toLowerCase()) && word.length <= 3) {
        return word.toLowerCase()
      }
      
      // Primeira letra maiúscula, resto minúscula
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .filter(Boolean)
    .join(' ')
}

async function normalizeAllPatientNames() {
  console.log('🔄 Iniciando normalização de nomes de pacientes...')
  
  try {
    // Buscar todos os pacientes
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        name: true
      }
    })
    
    console.log(`📊 Encontrados ${patients.length} pacientes para processar`)
    
    let updated = 0
    let skipped = 0
    
    for (const patient of patients) {
      const normalizedName = normalizeName(patient.name)
      
      // Só atualiza se o nome mudou
      if (normalizedName !== patient.name) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { name: normalizedName }
        })
        
        console.log(`✅ Atualizado: "${patient.name}" → "${normalizedName}"`)
        updated++
      } else {
        skipped++
      }
    }
    
    console.log('\n📈 Resumo:')
    console.log(`  ✅ Atualizados: ${updated}`)
    console.log(`  ⏭️  Sem mudanças: ${skipped}`)
    console.log(`  📊 Total: ${patients.length}`)
    console.log('\n✅ Normalização concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao normalizar nomes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar script
normalizeAllPatientNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
