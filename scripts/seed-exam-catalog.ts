#!/usr/bin/env tsx
/**
 * Seed de catálogo de exames a partir de fixtures
 * Uso: npm run db:seed:exam-catalog
 */

import 'dotenv/config'
import { PrismaClient, ExamCategory } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurado')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: ['error'],
})

interface ExamFixture {
  name: string
  abbreviation?: string
  description?: string
  examCategory: string
  minAge?: number
  maxAge?: number
  sexRestriction?: string
  susCode?: string
  preparation?: string
}

function loadFixtures(): ExamFixture[] {
  const fixturePath = path.join(process.cwd(), 'fixtures', '01-master-data', 'exams', 'exam-catalog.json')
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture não encontrado: ${fixturePath}`)
  }
  const raw = fs.readFileSync(fixturePath, 'utf-8')
  const data = JSON.parse(raw)
  const rows = data.data ?? data
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('fixtures/01-master-data/exams/exam-catalog.json está vazio ou inválido')
  }
  return rows
}

function mapCategory(s: string): ExamCategory {
  const map: Record<string, ExamCategory> = {
    LABORATORY: ExamCategory.LABORATORY,
    RADIOLOGY: ExamCategory.RADIOLOGY,
    ECG: ExamCategory.ECG,
    PHYSIOTHERAPY: ExamCategory.PHYSIOTHERAPY,
    APAC: ExamCategory.APAC,
    CYTOPATHOLOGY: ExamCategory.CYTOPATHOLOGY,
    MAMMOGRAPHY: ExamCategory.MAMMOGRAPHY,
    ULTRASOUND: ExamCategory.ULTRASOUND,
    LAB_ALTERNATIVE: ExamCategory.LAB_ALTERNATIVE,
    RAD_ALTERNATIVE: ExamCategory.RAD_ALTERNATIVE,
    OTHER_1: ExamCategory.OTHER_1,
    OTHER_2: ExamCategory.OTHER_2,
  }
  return map[s] ?? ExamCategory.LABORATORY
}

async function main() {
  console.log('🌱 Seeding exam catalog from fixtures...')

  const rows = loadFixtures()
  let created = 0

  for (const row of rows) {
    const existing = await prisma.examCatalog.findFirst({
      where: {
        name: row.name,
        abbreviation: row.abbreviation ?? undefined,
      },
    })
    if (existing) continue

    await prisma.examCatalog.create({
      data: {
        name: row.name,
        abbreviation: row.abbreviation ?? null,
        description: row.description ?? null,
        examCategory: mapCategory(row.examCategory),
        minAge: row.minAge ?? null,
        maxAge: row.maxAge ?? null,
        sexRestriction: row.sexRestriction ?? null,
        susCode: row.susCode ?? null,
        preparation: row.preparation ?? null,
        active: true,
      },
    })
    created++
  }

  console.log(`✅ ExamCatalog: ${created} exames criados (${rows.length} no fixture)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
