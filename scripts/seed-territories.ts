import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Territories from legacy fixtures...')

  const fixturesDir = path.join(process.cwd(), 'scripts', 'fixtures')

  // 1. Países
  console.log('Importing Countries...')
  const paisContent = fs.readFileSync(path.join(fixturesDir, 'pais.csv'), 'utf-8')
  const paises = parse(paisContent, { delimiter: ';', from_line: 1, relax_column_count: true })
  
  const countryMap = new Map<string, string>() // Legacy ID -> New UUID

  for (const row of paises) {
    const [legacyId, name, sigla] = row
    if (!name) continue

    const created = await prisma.territory.create({
      data: {
        name: name,
        type: 'COUNTRY',
        description: sigla,
        level: 0
      }
    })
    countryMap.set(legacyId, created.id)
  }
  console.log(`✅ Imported ${countryMap.size} countries.`)

  // 2. Estados
  console.log('Importing States...')
  const estadoContent = fs.readFileSync(path.join(fixturesDir, 'estado.csv'), 'utf-8')
  const estados = parse(estadoContent, { delimiter: ';', from_line: 1, relax_column_count: true })
  
  const stateMap = new Map<string, string>()

  for (const row of estados) {
    const [legacyId, name, sigla, _, paisId] = row
    if (!name) continue

    const parentId = countryMap.get(paisId)
    
    const created = await prisma.territory.create({
      data: {
        name: name,
        type: 'STATE',
        description: sigla,
        parentId: parentId,
        level: 1
      }
    })
    stateMap.set(legacyId, created.id)
  }
  console.log(`✅ Imported ${stateMap.size} states.`)

  // 3. Municípios
  console.log('Importing Municipalities...')
  const muniContent = fs.readFileSync(path.join(fixturesDir, 'municipios.csv'), 'utf-8')
  const municipios = parse(muniContent, { delimiter: ';', from_line: 1, relax_column_count: true })
  
  let muniCount = 0
  // Process in chunks to avoid memory issues if too large, but 10k is fine for Node
  for (const row of municipios) {
    const [legacyId, name, _, __, estadoId] = row
    if (!name) continue

    const parentId = stateMap.get(estadoId)
    if (!parentId) continue // Skip if state not found (shouldn't happen if fixtures are consistent)

    await prisma.territory.create({
      data: {
        name: name,
        type: 'MUNICIPALITY',
        parentId: parentId,
        level: 2
      }
    })
    muniCount++
    if (muniCount % 500 === 0) process.stdout.write('.')
  }
  console.log(`\n✅ Imported ${muniCount} municipalities.`)

  console.log('🏁 Territory seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
