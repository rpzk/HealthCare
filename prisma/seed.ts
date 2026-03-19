import 'dotenv/config'
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
  const isProduction = process.env.NODE_ENV === 'production'
  console.log(`Iniciando seed do banco de dados (${isProduction ? 'produção' : 'desenvolvimento'})...`)

  if (isProduction) {
    // Em produção: nenhum usuário de teste é criado.
    // Use: docker exec -it healthcare-app node scripts/createsuperuser.js
    console.log('✅ Seed de produção: nenhum usuário de demonstração criado.')
    console.log('   Para criar o admin: docker exec -it healthcare-app node scripts/createsuperuser.js')
    return
  }

  // ── Usuários de desenvolvimento/teste (apenas fora de produção) ──────────

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

  const nurseUser = await prisma.user.upsert({
    where: { email: 'nurse@healthcare.com' },
    update: {},
    create: {
      email: 'nurse@healthcare.com',
      name: 'Enf. Maria Santos',
      role: Role.NURSE,
      speciality: 'Enfermagem Geral',
      licenseNumber: 'COREN-SP 123456',
      licenseType: 'COREN',
      licenseState: 'SP',
      phone: '(11) 98765-4321',
      password: await bcrypt.hash('nurse123', 12),
    },
  })

  const technicianUser = await prisma.user.upsert({
    where: { email: 'technician@healthcare.com' },
    update: {},
    create: {
      email: 'technician@healthcare.com',
      name: 'Téc. Carlos Oliveira',
      role: Role.TECHNICIAN,
      speciality: 'Técnico de Enfermagem',
      licenseNumber: 'COREN-SP 654321',
      licenseType: 'COREN',
      licenseState: 'SP',
      phone: '(11) 98765-4322',
      password: await bcrypt.hash('tech123', 12),
    },
  })

  const receptionistUser = await prisma.user.upsert({
    where: { email: 'receptionist@healthcare.com' },
    update: {},
    create: {
      email: 'receptionist@healthcare.com',
      name: 'Ana Recepção',
      role: Role.RECEPTIONIST,
      phone: '(11) 98765-4323',
      password: await bcrypt.hash('recep123', 12),
    },
  })

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
  console.log(`Admin: ${adminUser.email} / admin123`)
  console.log(`Médico: ${doctorUser.email} / doctor123`)
  console.log(`Paciente: ${patientUser.email} / patient123`)
  console.log(`Equipe: ${nurseUser.email} | ${technicianUser.email} | ${receptionistUser.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
