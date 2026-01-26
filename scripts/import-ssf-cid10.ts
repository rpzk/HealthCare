/**
 * Importador CID-10 a partir dos fixtures do SSF (Django JSON fixtures)
 *
 * Fonte (repo): ssf/Fixtures/CID10/
 *  - Categoria.json
 *  - CID10_SubCategoria.json
 *  - CID10 - Capitulos.json (opcional, para mapear capítulo)
 *
 * Uso:
 *  npx tsx scripts/import-ssf-cid10.ts \
 *    --dir ssf/Fixtures/CID10 \
 *    --version SSF
 *
 * Observações:
 *  - Não cria dados fictícios. Apenas importa os dados reais dos arquivos.
 *  - Faz upsert do CodeSystem (kind=CID10) e upsert de MedicalCode por (systemId, code).
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

type FixtureRow = {
  model?: string
  pk?: number
  fields?: Record<string, unknown>
}

type ChapterFixture = {
  pk: number
  fields: {
    chapter: string
  }
}

type CategoryFixture = {
  pk: number
  fields: {
    code: string
    long_name?: string
    short_name?: string
    chapter?: number
  }
}

type SubCategoryFixture = {
  pk: number
  fields: {
    category: number
    code?: string | number | null
    long_name?: string
    short_name?: string
    manifestation?: number | null
    genre?: number | null
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function readJsonArray<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) throw new Error(`JSON não é array: ${filePath}`)
  return parsed as T[]
}

function mapSexRestriction(genre: number | null | undefined): 'M' | 'F' | null {
  // Pelo dump MySQL do SSF: 1=Masculino, 2=Feminino
  if (genre === 1) return 'M'
  if (genre === 2) return 'F'
  return null
}

function mapCrossAsterisk(manifestation: number | null | undefined): 'MANIFESTATION' | null {
  // Pelo SSF, ICD10Manifestation: 1=Doença de Base, 2=Manifestação.
  // No app, MANIFESTATION vira badge '*'. Preferimos não inferir ETIOLOGY (+) sem uma fonte explícita.
  if (manifestation === 2) return 'MANIFESTATION'
  return null
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const dir = getArg('--dir') || 'ssf/Fixtures/CID10'
  const version = getArg('--version') || 'SSF'

  const absDir = path.resolve(process.cwd(), dir)
  const catFile = path.join(absDir, 'Categoria.json')
  const subFile = path.join(absDir, 'CID10_SubCategoria.json')
  const chapFile = path.join(absDir, 'CID10 - Capitulos.json')

  for (const f of [catFile, subFile]) {
    if (!fs.existsSync(f)) {
      console.error('Arquivo não encontrado:', f)
      process.exit(1)
    }
  }

  const chaptersByPk = new Map<number, string>()
  if (fs.existsSync(chapFile)) {
    const chapters = readJsonArray<ChapterFixture>(chapFile)
    for (const ch of chapters) {
      if (ch?.pk && ch?.fields?.chapter) chaptersByPk.set(ch.pk, String(ch.fields.chapter).trim())
    }
  }

  const categoriesRaw = readJsonArray<FixtureRow>(catFile)
  const subcategoriesRaw = readJsonArray<FixtureRow>(subFile)

  const categories = categoriesRaw
    .filter((r): r is CategoryFixture => typeof r?.pk === 'number' && typeof (r as any)?.fields?.code === 'string')
    .map((r) => ({ pk: r.pk as number, fields: r.fields as any }))

  const subcategories = subcategoriesRaw
    .filter((r): r is SubCategoryFixture => typeof r?.pk === 'number' && typeof (r as any)?.fields?.category === 'number')
    .map((r) => ({ pk: r.pk as number, fields: r.fields as any }))

  console.log('CID10 fixtures:')
  console.log('  categorias:', categories.length)
  console.log('  subcategorias:', subcategories.length)

  const system = await prisma.codeSystem.upsert({
    where: { kind_version: { kind: 'CID10' as any, version } },
    update: { name: 'CID-10', active: true },
    create: { kind: 'CID10' as any, version, name: 'CID-10', description: 'Importado do SSF (fixtures)', active: true },
    select: { id: true },
  })

  const categoryByPk = new Map<number, { code: string; display: string; shortDescription: string | null; chapter: string | null }>()
  for (const c of categories) {
    const code = String(c.fields.code).trim()
    const display = String(c.fields.long_name || c.fields.short_name || code).trim()
    const shortDescription = c.fields.short_name ? String(c.fields.short_name).trim() : null
    const chapterPk = typeof c.fields.chapter === 'number' ? c.fields.chapter : null
    const chapter = chapterPk ? chaptersByPk.get(chapterPk) || null : null
    categoryByPk.set(c.pk, { code, display, shortDescription, chapter })
  }

  // 1) Upsert categorias (isCategory=true)
  console.log('Upsert categorias...')
  for (const { code, display, shortDescription, chapter } of categoryByPk.values()) {
    await prisma.medicalCode.upsert({
      where: { systemId_code: { systemId: system.id, code } },
      update: {
        display,
        shortDescription,
        description: display,
        isCategory: true,
        chapter,
        synonyms: shortDescription ? JSON.stringify([shortDescription]) : null,
        searchableText: `${code} ${display} ${shortDescription || ''}`.trim(),
        active: true,
      },
      create: {
        systemId: system.id,
        code,
        display,
        shortDescription,
        description: display,
        isCategory: true,
        chapter,
        synonyms: shortDescription ? JSON.stringify([shortDescription]) : null,
        searchableText: `${code} ${display} ${shortDescription || ''}`.trim(),
        active: true,
      },
      select: { id: true },
    })
  }

  const categoriesDb = await prisma.medicalCode.findMany({
    where: { systemId: system.id, isCategory: true },
    select: { id: true, code: true },
  })
  const categoryIdByCode = new Map<string, string>()
  for (const row of categoriesDb) categoryIdByCode.set(row.code, row.id)

  // 2) Upsert subcategorias (isCategory=false)
  console.log('Preparando subcategorias...')
  const subData = subcategories
    .map((s) => {
      const cat = categoryByPk.get(s.fields.category)
      if (!cat) return null

      const digit = s.fields.code
      const digitStr = digit === null || digit === undefined ? '' : String(digit).trim()
      if (!digitStr) return null

      const code = `${cat.code}.${digitStr}`
      const display = String(s.fields.long_name || s.fields.short_name || code).trim()
      const shortDescription = s.fields.short_name ? String(s.fields.short_name).trim() : null

      const parentId = categoryIdByCode.get(cat.code) || null
      const sexRestriction = mapSexRestriction(s.fields.genre)
      const crossAsterisk = mapCrossAsterisk(s.fields.manifestation)

      return {
        code,
        display,
        shortDescription,
        description: display,
        chapter: cat.chapter,
        parentId,
        sexRestriction,
        crossAsterisk,
        synonyms: shortDescription ? JSON.stringify([shortDescription]) : null,
        searchableText: `${code} ${display} ${shortDescription || ''}`.trim(),
      }
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  console.log('Upsert subcategorias:', subData.length)

  // Upsert em lotes pequenos (evita sobrecarregar conexão)
  const batches = chunk(subData, 500)
  let processed = 0
  for (const batch of batches) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.medicalCode.upsert({
          where: { systemId_code: { systemId: system.id, code: row.code } },
          update: {
            display: row.display,
            shortDescription: row.shortDescription,
            description: row.description,
            chapter: row.chapter,
            parentId: row.parentId,
            sexRestriction: row.sexRestriction,
            crossAsterisk: row.crossAsterisk,
            synonyms: row.synonyms,
            searchableText: row.searchableText,
            isCategory: false,
            active: true,
          },
          create: {
            systemId: system.id,
            code: row.code,
            display: row.display,
            shortDescription: row.shortDescription,
            description: row.description,
            chapter: row.chapter,
            parentId: row.parentId,
            sexRestriction: row.sexRestriction,
            crossAsterisk: row.crossAsterisk,
            synonyms: row.synonyms,
            searchableText: row.searchableText,
            isCategory: false,
            active: true,
          },
        })
      )
    )
    processed += batch.length
    if (processed % 2000 === 0 || processed === subData.length) {
      console.log(`  processados: ${processed}/${subData.length}`)
    }
  }

  const counts = await prisma.medicalCode.groupBy({
    by: ['isCategory'],
    where: { systemId: system.id },
    _count: { _all: true },
  })

  console.log('—'.repeat(60))
  console.log('Importação CID-10 concluída (systemId=' + system.id + '):')
  for (const c of counts) {
    console.log(`  isCategory=${c.isCategory}: ${c._count._all}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
