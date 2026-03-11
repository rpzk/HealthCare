#!/usr/bin/env tsx
/**
 * Seed de Branding padrão - dados da clínica para documentos
 * Cria registro inicial se não existir. Imprescindível para prescrições e atestados.
 *
 * Uso: npm run db:seed:branding
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurado')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: ['error'],
})

const DEFAULT_BRANDING = {
  clinicName: 'Sua Clínica',
  clinicAddress: 'Rua Exemplo, 123',
  clinicCity: 'Sua Cidade',
  clinicState: 'UF',
  clinicZipCode: '00000-000',
  clinicPhone: '(00) 00000-0000',
  footerText: 'Configure os dados da clínica em Configurações > Identidade visual',
}

async function main() {
  console.log('🌱 Seeding branding (dados da clínica)...')

  const existing = await prisma.branding.findFirst()
  if (existing) {
    console.log('   ⏭️  Branding já existe (pulando)')
    return
  }

  await prisma.branding.create({
    data: DEFAULT_BRANDING,
  })

  console.log('   ✅ Branding padrão criado')
  console.log('   ℹ️  Edite em Configurações > Identidade visual')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
