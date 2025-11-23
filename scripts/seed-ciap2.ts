import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ciapData = [
  { code: 'A01', description: 'Dor generalizada / múltipla', chapter: 'A' },
  { code: 'A03', description: 'Febre', chapter: 'A' },
  { code: 'A77', description: 'Viroses não especificadas', chapter: 'A' },
  { code: 'D01', description: 'Dor abdominal generalizada / cólicas', chapter: 'D' },
  { code: 'D02', description: 'Dor de estômago / epigástrica', chapter: 'D' },
  { code: 'H01', description: 'Dor de ouvido', chapter: 'H' },
  { code: 'K86', description: 'Hipertensão não complicada', chapter: 'K' },
  { code: 'P01', description: 'Sensação de ansiedade / nervosismo / tensão', chapter: 'P' },
  { code: 'P76', description: 'Perturbações depressivas', chapter: 'P' },
  { code: 'R05', description: 'Tosse', chapter: 'R' },
  { code: 'R74', description: 'Infecção aguda das vias aéreas superiores (IVAS)', chapter: 'R' },
  { code: 'T90', description: 'Diabetes não insulino-dependente', chapter: 'T' },
]

async function main() {
  console.log('🏥 Importando CIAP-2...')

  for (const item of ciapData) {
    await prisma.cIAP2.upsert({
      where: { code: item.code },
      update: { description: item.description, chapter: item.chapter },
      create: {
        code: item.code,
        description: item.description,
        chapter: item.chapter
      }
    })
  }

  console.log(`✅ ${ciapData.length} códigos CIAP-2 importados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
