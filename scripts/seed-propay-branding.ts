/**
 * Configura identidade visual com dados da Propay
 * Execute: npx tsx scripts/seed-propay-branding.ts (local)
 * Ou: docker compose -f docker-compose.prod.yml exec app npx tsx scripts/seed-propay-branding.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL não configurado')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter, log: ['error'] })

const PROPAY_BRANDING = {
  clinicName: 'Propay',
  clinicAddress: 'Avenida Paulista, 2.313 - 9º andar - Bela Vista',
  clinicCity: 'São Paulo',
  clinicState: 'SP',
  clinicZipCode: '01311-934',
  clinicPhone: '',
  footerText: 'Propay - Soluções e tecnologia para o RH | Av. Paulista, 2.313 - 9º andar - Bela Vista - São Paulo/SP - CEP 01311-934',
}

async function main() {
  console.log('Configurando identidade visual Propay...')
  const existing = await prisma.branding.findFirst()
  const result = existing
    ? await prisma.branding.update({ where: { id: existing.id }, data: PROPAY_BRANDING })
    : await prisma.branding.create({ data: PROPAY_BRANDING })
  console.log('Branding configurado:', result.clinicName, result.clinicCity)
  console.log('Para adicionar o logo: Admin > Configurações > Identidade Visual > upload da logo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
