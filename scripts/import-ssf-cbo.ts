/**
 * Importador CBO a partir dos fixtures do SSF (XLSX)
 *
 * Fonte (repo): ssf/Fixtures/CBO/
 *  - Ocupacao.xlsx (id, name)
 *  - Sinonimo.xlsx (occupation, name)
 *
 * Uso:
 *  npx tsx scripts/import-ssf-cbo.ts --dir ssf/Fixtures/CBO
 *
 * Observações:
 *  - Não cria dados fictícios. Apenas importa os dados reais dos arquivos.
 *  - Faz upsert de Occupation por code.
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
  const dir = getArg('--dir') || 'ssf/Fixtures/CBO'
  const absDir = path.resolve(process.cwd(), dir)

  const ocupFile = path.join(absDir, 'Ocupacao.xlsx')
  const sinonFile = path.join(absDir, 'Sinonimo.xlsx')

  for (const f of [ocupFile, sinonFile]) {
    if (!fs.existsSync(f)) {
      console.error('Arquivo não encontrado:', f)
      process.exit(1)
    }
  }

  const occupationsRows = await readXlsx(ocupFile)
  const synonymsRows = await readXlsx(sinonFile)

  const synonymsByOccupation = new Map<string, string[]>()
  for (const r of synonymsRows) {
    const occ = r['occupation']
    const name = r['name']
    if (occ === undefined || occ === null) continue
    if (!name || String(name).trim() === '') continue
    const code = String(occ).trim()
    const arr = synonymsByOccupation.get(code) || []
    arr.push(String(name).trim())
    synonymsByOccupation.set(code, arr)
  }

  console.log('CBO fixtures:')
  console.log('  occupations:', occupationsRows.length)
  console.log('  synonyms:', synonymsRows.length)

  let upserted = 0
  for (const r of occupationsRows) {
    const id = r['id']
    const name = r['name']
    if (id === undefined || id === null) continue
    if (!name || String(name).trim() === '') continue

    const code = String(id).trim()
    const title = String(name).trim()
    const syn = Array.from(new Set(synonymsByOccupation.get(code) || [])).sort((a, b) => a.localeCompare(b))

    await prisma.occupation.upsert({
      where: { code },
      update: { title, synonyms: syn.length ? JSON.stringify(syn) : null, active: true },
      create: { code, title, synonyms: syn.length ? JSON.stringify(syn) : null, active: true },
      select: { id: true },
    })

    upserted++
    if (upserted % 1000 === 0) console.log('  upserted:', upserted)
  }

  console.log('—'.repeat(60))
  console.log('Importação CBO concluída:')
  console.log('  occupations upserted:', upserted)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
