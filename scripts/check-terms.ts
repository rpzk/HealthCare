import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const databaseUrl = "postgresql://healthcare:umbrel_secure_pass@localhost:5432/healthcare_db"
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { in: ['admin@healthcare.com', 'doctor@healthcare.com', 'patient@healthcare.com'] }
    },
    include: {
      termAcceptances: true
    }
  })

  for (const u of users) {
    console.log(`User: ${u.email} (ID: ${u.id}) - Role: ${u.role}`)
    console.log(`  Acceptances: ${u.termAcceptances.length}`)
    for (const a of u.termAcceptances) {
      console.log(`    - Term ID: ${a.termId}, Accepted At: ${a.acceptedAt}`)
    }
  }

  const terms = await prisma.term.findMany({ where: { isActive: true } })
  console.log(`Active Terms: ${terms.length}`)
  for (const t of terms) {
    console.log(`  - ID: ${t.id}, Slug: ${t.slug}, Audience: ${t.audience}`)
  }
}

main().finally(() => prisma.$disconnect())
