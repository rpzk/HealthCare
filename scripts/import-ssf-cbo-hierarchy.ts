/**
 * Importador completo de CBO (hierarquia + ocupações) a partir dos fixtures do SSF
 *
 * Fontes (repo): ssf/Fixtures/CBO/
 *  - Grande Grupo.xlsx (id, code, name)
 *  - SubGrupo Principal.xlsx (id, name)
 *  - SubGrupo.xlsx (id, name)
 *  - Familia.xlsx (id, name)
 *  - Ocupacao.xlsx (id, name)
 *  - Sinonimo.xlsx (occupation, name)
 *  - Perfil.xlsx (grand_group, main_sub_group, sub_group, family, occupation, ...)
 *
 * O que faz:
 *  - Cria/atualiza CBOGroup com hierarquia: GrandeGrupo -> SubGrupoPrincipal -> SubGrupo -> Familia
 *  - Cria/atualiza Occupation com title/synonyms e liga Occupation.groupId à Familia
 *
 * Uso:
 *  npx tsx scripts/import-ssf-cbo-hierarchy.ts --dir ssf/Fixtures/CBO
 *
 * Observações:
 *  - Não cria dados fictícios: nomes vêm dos XLSX.
 *  - Os ids de cada tabela (ex: Familia.id) não são globais; para evitar colisão,
 *    usamos códigos namespaced (ex: "FAM:201").
 */

import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'
import { prisma } from '@/lib/prisma'

type Row = Record<string, unknown>

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function cellToInt(v: unknown): number | null {
  const s = cellToString(v)
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

async function readXlsx(filePath: string, sheetName?: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0]
  if (!ws) throw new Error(`Aba não encontrada no XLSX: ${filePath}`)

  const headers: string[] = []
  ws.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = normalizeHeader(String(cell.value || ''))
  })

  const rows: Row[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Row = {}
    row.eachCell((cell, colNumber) => {
      const v =
        cell.value instanceof Object && 'text' in (cell.value as any) ? (cell.value as any).text : cell.value
      obj[headers[colNumber - 1]] = v
    })

    if (Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) rows.push(obj)
  })

  return rows
}

function ggCode(code: number): string {
  return `GG:${code}`
}
function msgCode(id: number): string {
  return `MSG:${id}`
}
function sgCode(id: number): string {
  return `SG:${id}`
}
function famCode(id: number): string {
  return `FAM:${id}`
}

async function main() {
  const dir = getArg('--dir') || 'ssf/Fixtures/CBO'
  const absDir = path.resolve(process.cwd(), dir)

  const files = {
    grandeGrupo: path.join(absDir, 'Grande Grupo.xlsx'),
    mainSubGroup: path.join(absDir, 'SubGrupo Principal.xlsx'),
    subGroup: path.join(absDir, 'SubGrupo.xlsx'),
    familia: path.join(absDir, 'Familia.xlsx'),
    ocupacao: path.join(absDir, 'Ocupacao.xlsx'),
    sinonimo: path.join(absDir, 'Sinonimo.xlsx'),
    perfil: path.join(absDir, 'Perfil.xlsx'),
  }

  for (const [k, f] of Object.entries(files)) {
    if (!fs.existsSync(f)) {
      console.error(`Arquivo não encontrado (${k}):`, f)
      process.exit(1)
    }
  }

  // 1) Carregar dicionários de nomes
  const ggRows = await readXlsx(files.grandeGrupo)
  const msgRows = await readXlsx(files.mainSubGroup)
  const sgRows = await readXlsx(files.subGroup)
  const famRows = await readXlsx(files.familia)
  const occRows = await readXlsx(files.ocupacao)
  const synRows = await readXlsx(files.sinonimo)

  const ggById = new Map<number, { code: number; name: string }>()
  for (const r of ggRows) {
    const id = cellToInt(r['id'])
    const codeVal = cellToInt(r['code'])
    const name = cellToString(r['name'])
    if (!id || codeVal === null || !name) continue
    ggById.set(id, { code: codeVal, name })
  }

  const msgNameById = new Map<number, string>()
  for (const r of msgRows) {
    const id = cellToInt(r['id'])
    const name = cellToString(r['name'])
    if (!id || !name) continue
    msgNameById.set(id, name)
  }

  const sgNameById = new Map<number, string>()
  for (const r of sgRows) {
    const id = cellToInt(r['id'])
    const name = cellToString(r['name'])
    if (!id || !name) continue
    sgNameById.set(id, name)
  }

  const famNameById = new Map<number, string>()
  for (const r of famRows) {
    const id = cellToInt(r['id'])
    const name = cellToString(r['name'])
    if (!id || !name) continue
    famNameById.set(id, name)
  }

  const synonymsByOcc = new Map<string, string[]>()
  for (const r of synRows) {
    const occ = cellToString(r['occupation'])
    const name = cellToString(r['name'])
    if (!occ || !name) continue
    const arr = synonymsByOcc.get(occ) || []
    arr.push(name)
    synonymsByOcc.set(occ, arr)
  }

  // 2) Ler Perfil.xlsx e derivar relações pai/filho
  // Perfil tem muitas linhas (ocupação x atividade); pegamos a primeira ocorrência por ocupação.
  const profileRows = await readXlsx(files.perfil)

  const msgToGg = new Map<number, number>()
  const sgToMsg = new Map<number, number>()
  const famToSg = new Map<number, number>()
  const occToFam = new Map<string, number>()

  for (const r of profileRows) {
    const ggId = cellToInt(r['grand_group'])
    const msgId = cellToInt(r['main_sub_group'])
    const sgId = cellToInt(r['sub_group'])
    const famId = cellToInt(r['family'])
    const occId = cellToInt(r['occupation'])

    if (ggId && msgId && !msgToGg.has(msgId)) msgToGg.set(msgId, ggId)
    if (msgId && sgId && !sgToMsg.has(sgId)) sgToMsg.set(sgId, msgId)
    if (sgId && famId && !famToSg.has(famId)) famToSg.set(famId, sgId)
    if (occId && famId) {
      const key = String(occId)
      if (!occToFam.has(key)) occToFam.set(key, famId)
    }
  }

  console.log('CBO (SSF) - mapeamentos (via Perfil):')
  console.log('  grande grupos:', ggById.size)
  console.log('  main_sub_groups:', msgNameById.size, 'com parent:', msgToGg.size)
  console.log('  sub_groups:', sgNameById.size, 'com parent:', sgToMsg.size)
  console.log('  familias:', famNameById.size, 'com parent:', famToSg.size)
  console.log('  ocupações (no Perfil):', occToFam.size)

  // 3) Upsert de grupos em ordem hierárquica
  let ggUp = 0
  let msgUp = 0
  let sgUp = 0
  let famUp = 0

  for (const [ggId, gg] of ggById.entries()) {
    // usamos o code real da planilha para formar um identificador estável
    await OccupationCapabilityService.upsertGroup({ code: ggCode(gg.code), name: gg.name, level: 1 })
    ggUp++
  }

  for (const [id, name] of msgNameById.entries()) {
    const ggId = msgToGg.get(id)
    const gg = ggId ? ggById.get(ggId) : null
    const parentCode = gg ? ggCode(gg.code) : undefined
    await OccupationCapabilityService.upsertGroup({ code: msgCode(id), name, level: 2, parentCode })
    msgUp++
  }

  for (const [id, name] of sgNameById.entries()) {
    const parent = sgToMsg.get(id)
    const parentCode = parent ? msgCode(parent) : undefined
    await OccupationCapabilityService.upsertGroup({ code: sgCode(id), name, level: 3, parentCode })
    sgUp++
  }

  for (const [id, name] of famNameById.entries()) {
    const parent = famToSg.get(id)
    const parentCode = parent ? sgCode(parent) : undefined
    await OccupationCapabilityService.upsertGroup({ code: famCode(id), name, level: 4, parentCode })
    famUp++
  }

  // 4) Upsert ocupações, vinculando ao grupo mais específico (Família)
  let occUp = 0
  let occLinked = 0

  for (const r of occRows) {
    const id = cellToInt(r['id'])
    const name = cellToString(r['name'])
    if (!id || !name) continue
    const code = String(id)

    const famId = occToFam.get(code)
    const groupCode = famId ? famCode(famId) : undefined

    const syn = Array.from(new Set((synonymsByOcc.get(code) || []).map((x) => x.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )

    await OccupationCapabilityService.upsertOccupation({
      code,
      title: name,
      groupCode,
      synonyms: syn.length ? syn : undefined,
    })

    occUp++
    if (groupCode) occLinked++
    if (occUp % 1000 === 0) console.log('  occupations upserted:', occUp)
  }

  const counts = await prisma.$transaction([
    (prisma as any).cBOGroup.count(),
    (prisma as any).occupation.count(),
    (prisma as any).occupation.count({ where: { groupId: { not: null } } }),
  ])

  console.log('—'.repeat(60))
  console.log('Importação CBO (hierarquia) concluída:')
  console.log('  CBOGroup upserted:', ggUp + msgUp + sgUp + famUp, `(GG=${ggUp}, MSG=${msgUp}, SG=${sgUp}, FAM=${famUp})`)
  console.log('  Occupations upserted:', occUp)
  console.log('  Occupations linked to group:', occLinked)
  console.log('  DB counts:', { cboGroups: counts[0], occupations: counts[1], occupationsWithGroup: counts[2] })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
