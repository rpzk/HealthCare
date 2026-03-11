import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db' 
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function test() {
  console.log('Modelos disponíveis (primeiros 30):')
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
  models.slice(0, 30).forEach((m, i) => console.log(`  ${(i+1).toString().padStart(2)}. ${m}`))
  
  console.log('\nTotal de modelos:', models.length)
  
  console.log('\nTestando CBO:')
  console.log('  - cBOSynonym:', typeof (prisma as { cBOSynonym?: unknown }).cBOSynonym)
  
  await prisma.$disconnect()
  await pool.end()
}

test()
