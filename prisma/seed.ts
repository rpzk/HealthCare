import { PrismaClient, Gender, ConsultationType, ConsultationStatus, RecordType, Severity, Role } from '@prisma/client'
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

const prisma = new PrismaClient()

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

  console.log('Seed concluído com sucesso!')
  console.log(`Usuário admin criado: ${adminUser.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
