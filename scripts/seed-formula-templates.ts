#!/usr/bin/env tsx
/**
 * Seed de templates de fórmulas magistrais a partir de fixtures
 * Uso: npm run db:seed:formula-templates
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

interface FormulaFixture {
  name: string
  category: string
  ingredients: string
  form: string
  dosage: string
  notes?: string
  indications?: string
  contraindications?: string
  sideEffects?: string
  interactions?: string
  monitoring?: string
  duration?: string
}

function loadFixtures(): FormulaFixture[] {
  const fixturePath = path.join(process.cwd(), 'fixtures', '01-master-data', 'formulas', 'formula-templates.json')
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture não encontrado: ${fixturePath}`)
  }
  const raw = fs.readFileSync(fixturePath, 'utf-8')
  const data = JSON.parse(raw)
  const rows = data.data ?? data
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('fixtures/01-master-data/formulas/formula-templates.json está vazio ou inválido')
  }
  return rows
}

async function main() {
  console.log('🌱 Seeding formula templates from fixtures...')

  const rows = loadFixtures()
  let created = 0

  for (const row of rows) {
    const existing = await prisma.formulaTemplate.findFirst({
      where: { name: row.name, category: row.category },
    })
    if (existing) continue

    await prisma.formulaTemplate.create({
      data: {
        name: row.name,
        category: row.category,
        ingredients: row.ingredients,
        form: row.form,
        dosage: row.dosage,
        notes: row.notes ?? null,
        indications: row.indications ?? null,
        contraindications: row.contraindications ?? null,
        sideEffects: row.sideEffects ?? null,
        interactions: row.interactions ?? null,
        monitoring: row.monitoring ?? null,
        duration: row.duration ?? null,
        source: 'Fixture - fórmulas genéricas',
        active: true,
      },
    })
    created++
  }

  console.log(`✅ FormulaTemplate: ${created} fórmulas criadas (${rows.length} no fixture)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
