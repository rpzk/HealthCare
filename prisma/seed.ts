import { PrismaClient, Gender, ConsultationType, ConsultationStatus, RecordType, Severity, Role, RiskLevel } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Encrypt helper (replica mínima de lib/crypto.ts)
const ENC_ALG = 'aes-256-gcm'
const KEY = (process.env.ENCRYPTION_KEY || '').padEnd(32, '0').slice(0,32)
function encrypt(value?: string | null): string | null {
  if (!value) return null
  try {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ENC_ALG, Buffer.from(KEY), iv)
    const enc = Buffer.concat([cipher.update(value,'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return 'enc::' + Buffer.concat([iv, tag, enc]).toString('base64')
  } catch {
    return null
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Criar usuário administrador
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
      name: 'Dr. Admin Sistema',
      role: Role.ADMIN,
      speciality: 'Administração',
      crmNumber: 'CRM-ADM-001',
      phone: '(11) 99999-9999',
      password: await bcrypt.hash('admin123', 12)
    },
  })

  // Médico para testes E2E (jornada do profissional)
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@healthcare.com' },
    update: {},
    create: {
      email: 'doctor@healthcare.com',
      name: 'Dr. João Silva',
      role: Role.DOCTOR,
      speciality: 'Clínico Geral',
      crmNumber: 'CRM-SP 123456',
      licenseState: 'SP',
      phone: '(11) 98888-8888',
      password: await bcrypt.hash('doctor123', 12),
    },
  })

  // Paciente + User paciente para testes E2E (jornada do paciente)
  const birthDate = new Date('1985-06-15')
  const patientRecord = await prisma.patient.upsert({
    where: { email: 'patient@healthcare.com' },
    update: {},
    create: {
      name: 'Maria Paciente',
      email: 'patient@healthcare.com',
      birthDate,
      gender: Gender.FEMALE,
      phone: '(11) 97777-7777',
      address: 'Rua Teste, 100',
      riskLevel: RiskLevel.BAIXO,
    },
  })
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@healthcare.com' },
    update: {},
    create: {
      email: 'patient@healthcare.com',
      name: 'Maria Paciente',
      role: Role.PATIENT,
      phone: '(11) 97777-7777',
      password: await bcrypt.hash('patient123', 12),
      patientId: patientRecord.id,
    },
  })

  console.log('Seed concluído com sucesso!')
  console.log(`Usuário admin: ${adminUser.email}`)
  console.log(`Usuário médico (E2E): ${doctorUser.email}`)
  console.log(`Usuário paciente (E2E): ${patientUser.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
