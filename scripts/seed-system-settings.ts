import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurado')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
})

interface SystemSettingFixture {
  key: string
  value: string
  category?: string
  encrypted?: boolean
  isPublic?: boolean
  description?: string
}

function loadSettingsFromFixtures(): SystemSettingFixture[] {
  const fixturePath = path.join(process.cwd(), 'fixtures', 'system-settings.json')
  if (fs.existsSync(fixturePath)) {
    const raw = fs.readFileSync(fixturePath, 'utf-8')
    const data = JSON.parse(raw) as SystemSettingFixture[]
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
  }
  throw new Error(`fixtures/system-settings.json não encontrado ou inválido: ${fixturePath}`)
}

async function main() {
  console.log('🌱 Seeding system settings from fixtures...')

  const settings = loadSettingsFromFixtures()

  for (const setting of settings) {
    const { description, ...data } = setting
    const createData = {
      key: data.key,
      value: data.value,
      category: data.category ?? 'GENERAL',
      encrypted: data.encrypted ?? false,
      isPublic: data.isPublic ?? false,
    }

    await prisma.systemSetting.upsert({
      where: { key: data.key },
      update: createData,
      create: createData,
    })

    console.log(`✅ ${data.key} (${createData.category})`)
  }

  console.log(`\n✨ Seeded ${settings.length} settings successfully!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding settings:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
