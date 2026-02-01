import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

async function main() {
  const password = await bcrypt.hash('admin123', 12)
  const docPassword = await bcrypt.hash('doctor123', 12)
  const patPassword = await bcrypt.hash('patient123', 12)

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
      name: 'Dr. Admin',
      role: Role.ADMIN,
      password,
    },
  })

  // Doctor
  await prisma.user.upsert({
    where: { email: 'doctor@healthcare.com' },
    update: {},
    create: {
      email: 'doctor@healthcare.com',
      name: 'Dr. House',
      role: Role.DOCTOR,
      password: docPassword,
      crmNumber: 'CRM12345',
      speciality: 'Diagnóstico',
    },
  })

  // Patient
  const patient = await prisma.user.upsert({
    where: { email: 'patient@healthcare.com' },
    update: {},
    create: {
      email: 'patient@healthcare.com',
      name: 'João Paciente',
      role: Role.PATIENT,
      password: patPassword,
    },
  })

  // Setup all active terms as accepted to unblock testing
  console.log('Setting up term acceptances for all active terms...')
  const activeTerms = await prisma.term.findMany({
    where: { isActive: true }
  })

  const users = await prisma.user.findMany({
    where: {
      email: { in: ['admin@healthcare.com', 'doctor@healthcare.com', 'patient@healthcare.com'] }
    }
  })

  for (const u of users) {
    for (const term of activeTerms) {
      // Check if already accepted
      const existing = await prisma.termAcceptance.findFirst({
        where: {
          userId: u.id,
          termId: term.id
        }
      })

      if (!existing) {
        await prisma.termAcceptance.create({
          data: {
            userId: u.id,
            termId: term.id,
            ipAddress: '127.0.0.1',
            userAgent: 'Test script',
            termSlug: term.slug,
            termTitle: term.title,
            termVersion: term.version,
            termContent: term.content
          }
        })
      }
    }
  }

  console.log(`Accepted ${activeTerms.length} terms for each test user.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
