import fs from 'fs'
import path from 'path'
import { PrismaClient, CodeSystemKind, PrescriptionType } from '@prisma/client'

const prisma = new PrismaClient({ log: ['error'] })

const ROOT = path.join(__dirname, '..')
const SSF_FIXTURES = path.join(ROOT, 'ssf', 'fixtures')

async function ensureCodeSystem(kind: CodeSystemKind, version: string, description?: string) {
  const existing = await prisma.codeSystem.findFirst({ where: { kind, version } })
  if (existing) return existing
  return prisma.codeSystem.create({ data: { kind, version, name: `${kind} ${version}`, description } })
}

async function importCID10() {
  const system = await ensureCodeSystem(CodeSystemKind.CID10, 'ssf-fixtures', 'CID-10 importado das fixtures SSF')
  const filePath = path.join(SSF_FIXTURES, 'cid.csv')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)

  const rows = lines.map((line) => line.split(';'))
  const payload = rows.map((cols) => {
    const [, code, , , , shortPt, longPt] = cols
    return {
      systemId: system.id,
      code,
      display: longPt || shortPt || code,
      description: longPt || shortPt,
      shortDescription: shortPt,
      isCategory: (cols[2] || '0') === '0',
      active: true,
    }
  })

  // Inserção em lotes para evitar limites do banco
  const chunkSize = 500
  for (let i = 0; i < payload.length; i += chunkSize) {
    const slice = payload.slice(i, i + chunkSize)
    await prisma.medicalCode.createMany({ data: slice, skipDuplicates: true })
    console.log(`CID10: inseridos ${Math.min(i + chunkSize, payload.length)} / ${payload.length}`)
  }
}

async function importCIAP2() {
  const filePath = path.join(SSF_FIXTURES, 'ciap2.csv')
  if (!fs.existsSync(filePath)) {
    console.warn('CIAP2: arquivo ciap2.csv não encontrado em ssf/fixtures - ignorando')
    return
  }

  const system = await ensureCodeSystem(CodeSystemKind.CIAP2, 'ssf-fixtures', 'CIAP-2 importado das fixtures SSF')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const rows = lines.map((line) => line.split(';'))

  const payload = rows.map((cols) => {
    const [code, label, chapter, description] = cols
    return {
      systemId: system.id,
      code,
      display: label || description || code,
      description: description || label,
      chapter: chapter || null,
      isCategory: false,
      active: true,
    }
  })

  const chunkSize = 500
  for (let i = 0; i < payload.length; i += chunkSize) {
    const slice = payload.slice(i, i + chunkSize)
    await prisma.medicalCode.createMany({ data: slice, skipDuplicates: true })
    console.log(`CIAP2: inseridos ${Math.min(i + chunkSize, payload.length)} / ${payload.length}`)
  }
}

async function importNanda() {
  const system = await ensureCodeSystem(CodeSystemKind.NURSING, 'ssf-fixtures', 'Classificação NANDA importada das fixtures SSF')
  const filePath = path.join(SSF_FIXTURES, 'nanda.csv')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const rows = lines.map((line) => line.split(';'))

  const payload = rows.map((cols) => {
    const [id, group, name] = cols
    return {
      systemId: system.id,
      code: id,
      display: name,
      description: name,
      chapter: group || null,
      isCategory: false,
      active: true,
    }
  })

  const chunkSize = 500
  for (let i = 0; i < payload.length; i += chunkSize) {
    const slice = payload.slice(i, i + chunkSize)
    await prisma.medicalCode.createMany({ data: slice, skipDuplicates: true })
    console.log(`NANDA: inseridos ${Math.min(i + chunkSize, payload.length)} / ${payload.length}`)
  }
}

async function importCBO() {
  const filePath = path.join(SSF_FIXTURES, 'cbo.csv')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const rows = lines.map((line) => line.split(';'))

  const occupations = rows.map((cols) => ({ code: cols[1], title: cols[2], description: null }))
  const chunkSize = 500
  for (let i = 0; i < occupations.length; i += chunkSize) {
    const slice = occupations.slice(i, i + chunkSize)
    await prisma.occupation.createMany({ data: slice, skipDuplicates: true })
    console.log(`CBO: inseridos ${Math.min(i + chunkSize, occupations.length)} / ${occupations.length}`)
  }
}

function mapPrescriptionType(code?: string | number | null): PrescriptionType {
  if (code === '3' || code === 3) return PrescriptionType.CONTROLLED
  if (code === '2' || code === 2) return PrescriptionType.CONTINUOUS
  return PrescriptionType.SYMPTOMATIC
}

async function importMedications() {
  const filePath = path.join(SSF_FIXTURES, 'medicacoes_basicas.json')
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<{
    fields: Record<string, unknown>
  }>

  const meds = json.map(({ fields }) => {
    const f = fields as Record<string, any>
    return {
      name: f.medicacao as string,
      synonym: (f.sinonimo as string) || null,
      tradeName: (f.fantasia as string) || null,
      prescriptionType: mapPrescriptionType(f.receita),
      basicPharmacy: !!f.basica,
      municipalPharmacy: !!f.municipal,
      statePharmacy: !!f.estadual,
      homePharmacy: !!f.domiciliar,
      popularPharmacy: !!f.popular,
      hospitalPharmacy: !!f.hospitalar,
      commercialPharmacy: !!f.comercial,
      compoundPharmacy: !!f.manipulado,
    }
  })

  const chunkSize = 200
  for (let i = 0; i < meds.length; i += chunkSize) {
    const slice = meds.slice(i, i + chunkSize)
    await prisma.medication.createMany({ data: slice, skipDuplicates: true })
    console.log(`Medicamentos: inseridos ${Math.min(i + chunkSize, meds.length)} / ${meds.length}`)
  }
}

async function main() {
  const tasks = process.argv.slice(2)
  const doAll = tasks.length === 0

  if (doAll || tasks.includes('cid')) await importCID10()
  if (doAll || tasks.includes('ciap')) await importCIAP2()
  if (doAll || tasks.includes('cbo')) await importCBO()
  if (doAll || tasks.includes('meds')) await importMedications()
  if (doAll || tasks.includes('nanda')) await importNanda()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
