#!/usr/bin/env tsx
/**
 * Script genérico de importação de códigos clínicos a partir de CSV.
 * Formato esperado do CSV (header): code,display,description,parentCode,synonyms
 * - synonyms: lista separada por | (pipe)
 * Uso:
 *  npx tsx scripts/import-codes-csv.ts --system CID10 --version 2025 --file ./data/cid10.csv --rebuild
 */
import fs from 'fs'
import path from 'path'
import { argv } from 'process'
import { prisma } from '@/lib/prisma'
import { CodingService } from '@/lib/coding-service'
import * as PrismaNS from '@prisma/client'
const { CodeSystemKind } = PrismaNS as any

function parseArgs() {
  const args: Record<string,string|boolean> = {}
  for (let i=2;i<argv.length;i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2)
      const val = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : 'true'
      args[key] = val
    }
  }
  return args
}

async function main() {
  const args = parseArgs()
  const system = String(args.system || '') as any
  if (!system) throw new Error('--system é obrigatório (CID10|CID11|CIAP2|NURSING)')
  if (!CodeSystemKind[system]) throw new Error('system inválido')
  const file = String(args.file || '')
  if (!file) throw new Error('--file é obrigatório')
  const version = args.version ? String(args.version) : undefined
  const rebuild = args.rebuild === 'true'

  const content = fs.readFileSync(path.resolve(file), 'utf8')
  const lines = content.split(/\r?\n/).filter(l => l.trim().length)
  const header = lines.shift()!
  const cols = header.split(',').map(c=>c.trim())
  const idx = (name:string) => cols.indexOf(name)
  const expect = ['code','display']
  for (const e of expect) if (idx(e) === -1) throw new Error(`Coluna obrigatória ausente: ${e}`)

  const codes = [] as any[]
  for (const line of lines) {
    const parts = line.split(',')
    const get = (c:string) => {
      const i = idx(c); return i === -1 ? '' : (parts[i]||'').trim()
    }
    const code = get('code')
    const display = get('display')
    if (!code || !display) continue
    const description = get('description') || undefined
    const parentCode = get('parentCode') || undefined
    const synonymsRaw = get('synonyms')
    const synonyms = synonymsRaw ? synonymsRaw.split('|').map(s=>s.trim()).filter(Boolean) : undefined
    codes.push({ code, display, description, parentCode, synonyms })
  }

  console.log(`Importando ${codes.length} códigos para ${system} versão ${version || '(default)'}`)
  await CodingService.upsertCodeSystem({ kind: CodeSystemKind[system], name: system, version })
  const result = await CodingService.bulkImportCodes({ systemKind: CodeSystemKind[system], systemVersion: version, codes, rebuildSearchText: rebuild })
  console.log('Resultado:', result)
}

main().catch(e => { console.error(e); process.exit(1) })
