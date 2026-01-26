/**
 * Importador de vacinas a partir do fixture MySQL do SSF
 *
 * Fonte (repo): ssf/Fixtures/vacina.sql
 * Tabela origem: geral_vacina
 *
 * Uso:
 *  npx tsx scripts/import-ssf-vaccines.ts --file ssf/Fixtures/vacina.sql
 *
 * Observações importantes:
 *  - Não cria dados fictícios. Quando campos obrigatórios no modelo atual
 *    não existirem no fixture (ex: doses), o registro é ignorado e reportado.
 *  - ageGroups não existe no fixture; importamos como array vazio ("não informado").
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

type LegacyVaccineRow = {
  id: number
  vacina: string
  nome: string
  descricao: string
  patologias: string
  eventos: string
  contra: string
  local: string
  doses: string
  intervalo: string
  eficacia: string
  reforco: string
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function unescapeMysqlString(input: string): string {
  // dump contém sequências como \r\n; também preserva conteúdo real.
  return input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

function parseInsertValues(sql: string): unknown[][] {
  const startToken = 'INSERT INTO `geral_vacina` VALUES '
  const startIdx = sql.indexOf(startToken)
  if (startIdx === -1) throw new Error('Não encontrei INSERT INTO `geral_vacina` VALUES ...')

  // ler a partir do início do VALUES até o próximo ";" fora de string
  let i = startIdx + startToken.length
  let inStr = false
  let escape = false

  const tuples: unknown[][] = []
  let current: unknown[] | null = null
  let token = ''

  function flushToken(): void {
    const t = token.trim()
    token = ''
    if (!current) return
    // Valores vazios no dump aparecem como '' (aspas) e já são tratados
    // no caminho de string. Fora de string, token vazio não representa um valor.
    if (t === '') return
    if (t.toUpperCase() === 'NULL') {
      current.push(null)
      return
    }
    if (/^-?\d+(?:\.\d+)?$/.test(t)) {
      current.push(Number(t))
      return
    }
    // fallback (sem aspas) como string
    current.push(t)
  }

  while (i < sql.length) {
    const ch = sql[i]

    if (inStr) {
      if (escape) {
        token += ch
        escape = false
        i++
        continue
      }
      if (ch === '\\') {
        token += ch
        escape = true
        i++
        continue
      }
      if (ch === "'") {
        // fim da string
        inStr = false
        current?.push(unescapeMysqlString(token))
        token = ''
        i++
        continue
      }
      token += ch
      i++
      continue
    }

    // fora de string
    if (ch === ';') {
      // fim do INSERT
      if (token.trim().length) flushToken()
      break
    }

    if (ch === "'") {
      inStr = true
      token = ''
      i++
      continue
    }

    if (ch === '(') {
      current = []
      token = ''
      i++
      continue
    }

    if (ch === ',') {
      if (current) flushToken()
      i++
      continue
    }

    if (ch === ')') {
      if (current) {
        if (token.trim().length) flushToken()
        tuples.push(current)
      }
      current = null
      token = ''
      i++
      continue
    }

    token += ch
    i++
  }

  return tuples
}

function splitDiseases(s: string): string[] {
  const raw = (s || '').trim()
  if (!raw) return []

  // normalizar separadores comuns
  const normalized = raw
    .replace(/\s+e\s+/gi, ',')
    .replace(/\s*\|\s*/g, ',')
    .replace(/\s*;\s*/g, ',')

  return Array.from(
    new Set(
      normalized
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    )
  ).slice(0, 50)
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  if (!Number.isInteger(n)) return Math.trunc(n)
  return n
}

async function main() {
  const file = getArg('--file') || 'ssf/Fixtures/vacina.sql'
  const abs = path.resolve(process.cwd(), file)
  if (!fs.existsSync(abs)) {
    console.error('Arquivo não encontrado:', abs)
    process.exit(1)
  }

  const sql = fs.readFileSync(abs, 'utf8')
  const tuples = parseInsertValues(sql)

  // ordem de colunas (geral_vacina):
  // id, vacina, nome, descricao, patologias, eventos, contra, local, doses, intervalo, eficacia, reforco
  const rows: LegacyVaccineRow[] = tuples
    .map((t) => {
      const id = Number(t[0])
      return {
        id,
        vacina: String(t[1] ?? '').trim(),
        nome: String(t[2] ?? '').trim(),
        descricao: String(t[3] ?? '').trim(),
        patologias: String(t[4] ?? '').trim(),
        eventos: String(t[5] ?? '').trim(),
        contra: String(t[6] ?? '').trim(),
        local: String(t[7] ?? '').trim(),
        doses: String(t[8] ?? '').trim(),
        intervalo: String(t[9] ?? '').trim(),
        eficacia: String(t[10] ?? '').trim(),
        reforco: String(t[11] ?? '').trim(),
      }
    })
    .filter((r) => r.nome.length > 0)

  // decidir quais codes são únicos; códigos duplicados viram null (evita conflito com unique)
  const codeCounts = new Map<string, number>()
  for (const r of rows) {
    const c = r.vacina
    if (!c) continue
    codeCounts.set(c, (codeCounts.get(c) || 0) + 1)
  }

  let createdOrUpdated = 0
  let skippedMissingRequired = 0

  for (const r of rows) {
    const dosesRequired = toIntOrNull(r.doses)
    if (!dosesRequired || dosesRequired <= 0) {
      skippedMissingRequired++
      continue
    }

    const intervalDays = toIntOrNull(r.intervalo)
    const boosterAfterMonths = toIntOrNull(r.reforco)

    const diseasesCovered = splitDiseases(r.patologias)

    const codeCandidate = r.vacina && codeCounts.get(r.vacina) === 1 ? r.vacina : null

    // ageGroups não existe neste fixture; registramos como [] (não informado)
    const data = {
      name: r.nome,
      code: codeCandidate,
      manufacturer: null,
      diseasesCovered,
      dosesRequired,
      intervalDays: intervalDays && intervalDays > 0 ? intervalDays : null,
      boosterRequired: Boolean(boosterAfterMonths && boosterAfterMonths > 0),
      boosterAfterMonths: boosterAfterMonths && boosterAfterMonths > 0 ? boosterAfterMonths : null,
      ageGroups: [] as string[],
      minAgeMonths: null,
      maxAgeMonths: null,
      description: r.descricao || null,
      contraindications: r.contra || null,
      sideEffects: r.eventos || null,
      active: true,
      pniIncluded: true,
    }

    if (data.code) {
      await prisma.vaccine.upsert({
        where: { code: data.code },
        update: data,
        create: data,
      })
      createdOrUpdated++
      continue
    }

    // fallback sem code único: tenta por name (case-insensitive) para evitar duplicar ao reexecutar
    const existing = await prisma.vaccine.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
      select: { id: true },
    })

    if (existing) {
      await prisma.vaccine.update({ where: { id: existing.id }, data })
      createdOrUpdated++
    } else {
      await prisma.vaccine.create({ data })
      createdOrUpdated++
    }
  }

  console.log('—'.repeat(60))
  console.log('Importação de vacinas (SSF) concluída:')
  console.log('  total tuples lidos:', tuples.length)
  console.log('  linhas com nome:', rows.length)
  console.log('  upserts/creates:', createdOrUpdated)
  console.log('  ignoradas (sem dosesRequired):', skippedMissingRequired)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
