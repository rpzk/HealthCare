#!/usr/bin/env tsx
/**
 * Seed de CIAP2 a partir de fixtures
 * Uso: npm run db:seed:ciap2
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurado')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: ['error'],
})

interface Ciap2Row {
  code: string
  description: string
  chapter: string
  gender?: string
}

function loadFixtures(): Ciap2Row[] {
  const fixturePath = path.join(process.cwd(), 'fixtures', '01-master-data', 'ciap2', 'ciap2-complete.json')
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture não encontrado: ${fixturePath}`)
  }
  const raw = fs.readFileSync(fixturePath, 'utf-8')
  const data = JSON.parse(raw)
  const rows = data.data ?? data
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('fixtures/01-master-data/ciap2/ciap2-complete.json está vazio ou inválido')
  }
  return rows
}

async function main() {
  console.log('🌱 Seeding CIAP2 from fixtures...')

  const rows = loadFixtures()
  let created = 0
  let updated = 0

  for (const row of rows) {
    const existing = await prisma.cIAP2.findUnique({ where: { code: row.code } })
    const data = {
      description: row.description,
      chapter: row.chapter,
      gender: row.gender ?? null,
      active: true,
    }
    if (existing) {
      await prisma.cIAP2.update({ where: { code: row.code }, data })
      updated++
    } else {
      await prisma.cIAP2.create({
        data: { code: row.code, ...data },
      })
      created++
    }
  }

  console.log(`✅ CIAP2: ${created} criados, ${updated} atualizados (total: ${rows.length})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
