/**
 * Importador de procedimentos a partir dos fixtures do SSF (XLSX)
 *
 * Fonte (repo): ssf/Fixtures/Procedimentos/
 *  - procedure.xlsx (id, name, subgroup, ...)
 *  - Rol.xlsx (id, name, Subgrupo (texto), Grupo (texto), Capítulo, flags)
 *
 * Uso:
 *  npx tsx scripts/import-ssf-procedures.ts --dir ssf/Fixtures/Procedimentos
 *
 * Observações:
 *  - Não cria dados fictícios. Apenas importa os dados reais dos arquivos.
 *  - O model Procedure no Prisma espera um "code" (comentado como SIGTAP),
 *    mas estes arquivos do SSF usam um id numérico. Importamos `code=String(id)`.
 */

import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'

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

type Row = Record<string, unknown>

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
      const v = cell.value instanceof Object && 'text' in (cell.value as any) ? (cell.value as any).text : cell.value
      obj[headers[colNumber - 1]] = v
    })
    if (Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) rows.push(obj)
  })

  return rows
}

async function main() {
  const dir = getArg('--dir') || 'ssf/Fixtures/Procedimentos'
  const absDir = path.resolve(process.cwd(), dir)

  const procedureFile = path.join(absDir, 'procedure.xlsx')
  const rolFile = path.join(absDir, 'Rol.xlsx')

  for (const f of [procedureFile, rolFile]) {
    if (!fs.existsSync(f)) {
      console.error('Arquivo não encontrado:', f)
      process.exit(1)
    }
  }

  const rolRows = await readXlsx(rolFile)
  const rolById = new Map<string, { group?: string; subgroup?: string }>()
  for (const r of rolRows) {
    const id = r['id']
    if (id === undefined || id === null) continue
    const code = String(id).trim()

    // Rol.xlsx tem colunas duplicadas e alguns headers vazios; normalizamos nomes comuns.
    const subgroupName = r['subgrupo'] ? String(r['subgrupo']).trim() : undefined
    const groupName = r['grupo'] ? String(r['grupo']).trim() : undefined

    rolById.set(code, { group: groupName, subgroup: subgroupName })
  }

  const rows = await readXlsx(procedureFile)
  console.log('Procedimentos fixtures:')
  console.log('  procedure.xlsx rows:', rows.length)
  console.log('  Rol.xlsx rows:', rolRows.length)

  let upserted = 0
  for (const r of rows) {
    const id = r['id']
    const name = r['name']
    if (id === undefined || id === null) continue
    if (!name || String(name).trim() === '') continue

    const code = String(id).trim()
    const procName = String(name).trim()
    const rol = rolById.get(code)

    await prisma.procedure.upsert({
      where: { code },
      update: { name: procName, group: rol?.group ?? null, subgroup: rol?.subgroup ?? null, active: true },
      create: { code, name: procName, group: rol?.group ?? null, subgroup: rol?.subgroup ?? null, active: true },
      select: { id: true },
    })

    upserted++
    if (upserted % 1000 === 0) console.log('  upserted:', upserted)
  }

  console.log('—'.repeat(60))
  console.log('Importação de procedimentos concluída:')
  console.log('  procedures upserted:', upserted)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
