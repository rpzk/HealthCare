/**
 * Importador de pacientes (dados reais via CSV/XLSX)
 *
 * Uso:
 *  - CSV:  npx tsx scripts/import-patients.ts --file /caminho/pacientes.csv
 *  - XLSX: npx tsx scripts/import-patients.ts --file /caminho/pacientes.xlsx --sheet Aba
 *  - Opcional: vincular ao profissional responsável: --assignToUserId <userId> --addedById <userId>
 *
 * Regras:
 *  - Não cria dados de exemplo. Apenas importa arquivos reais fornecidos por você.
 *  - Faz upsert por CPF (quando disponível) ou email (fallback).
 *  - Colunas suportadas (variações PT/EN aceitas):
 *    name, email, phone, cpf, birthDate, gender, emergencyContact, address,
 *    allergies, currentMedications, riskLevel, insuranceNumber, latitude, longitude
 */

import { PrismaClient, Gender, RiskLevel } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import { PatientService } from '@/lib/patient-service'
import { addToCareTeam } from '@/lib/patient-access'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({
  adapter,
})

type Row = Record<string, any>

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function normalizeKey(k: string): string { return k.toLowerCase().trim() }

function readCSV(file: string): Row[] {
  const content = fs.readFileSync(file, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true }) as Row[]
  return records
}

async function readXLSX(file: string, sheetName?: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0]
  if (!ws) throw new Error('Aba não encontrada no XLSX')
  const headers: string[] = []
  ws.getRow(1).eachCell((cell, colNumber) => { headers[colNumber - 1] = String(cell.value || '').trim() })
  const rows: Row[] = []
  ws.eachRow((row, rn) => {
    if (rn === 1) return
    const obj: Row = {}
    row.eachCell((cell, cn) => { obj[headers[cn - 1]] = (cell as any).text ?? cell.value })
    if (Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) rows.push(obj)
  })
  return rows
}

function mapGender(v: any): Gender {
  const s = String(v || '').trim().toUpperCase()
  if (['M', 'MALE', 'MASCULINO'].includes(s)) return 'MALE'
  if (['F', 'FEMALE', 'FEMININO'].includes(s)) return 'FEMALE'
  return 'OTHER'
}

function mapRisk(v: any): RiskLevel | undefined {
  const s = String(v || '').trim().toUpperCase()
  if (!s) return undefined
  const map: Record<string, RiskLevel> = { BAIXO: 'BAIXO', MEDIO: 'MEDIO', ALTO: 'ALTO', CRITICO: 'CRITICO', LOW: 'BAIXO', MEDIUM: 'MEDIO', HIGH: 'ALTO', CRITICAL: 'CRITICO' }
  return map[s]
}

function toNum(v: any): number | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? undefined : n
}

function normalizeRow(row: Row): Row { const o: Row = {}; for (const [k, v] of Object.entries(row)) o[normalizeKey(k)] = v; return o }

function get(obj: Row, ...keys: string[]) { return keys.map(normalizeKey).map((k) => obj[k]).find((x) => x !== undefined) }

async function upsertPatient(norm: Row, assignToUserId?: string, addedById?: string) {
  const name = String(get(norm, 'name', 'nome') || '').trim()
  const email = String(get(norm, 'email') || '').trim()
  const cpf = String(get(norm, 'cpf') || '').replace(/\D/g, '') || undefined
  const birthDateRaw = get(norm, 'birthdate', 'data de nascimento', 'nascimento')
  if (!name) throw new Error('Linha sem "name/nome"')

  let birthDate: Date | undefined
  if (birthDateRaw) {
    const dt = new Date(String(birthDateRaw))
    if (!isNaN(dt.getTime())) birthDate = dt
  }

  // Se já existe por CPF (hash feito dentro do service) ou por email
  let existing = null as { id: string } | null
  if (cpf) existing = await prisma.patient.findFirst({ where: { cpf: { not: null } }, select: { id: true } })
  if (!existing && email) existing = await prisma.patient.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })

  const data = {
    name,
    email: email || undefined,
    phone: (get(norm, 'phone', 'telefone') as string) || undefined,
    cpf,
    birthDate: birthDate || new Date('1970-01-01'),
    gender: mapGender(get(norm, 'gender', 'sexo')),
    emergencyContact: (get(norm, 'emergencycontact', 'contato de emergencia') as string) || undefined,
    address: (get(norm, 'address', 'endereco') as string) || undefined,
    allergies: (get(norm, 'allergies', 'alergias') as string) || undefined,
    currentMedications: (get(norm, 'currentmedications', 'medicacoes', 'medicamentos') as string) || undefined,
    riskLevel: mapRisk(get(norm, 'risklevel', 'risco')),
    insuranceNumber: (get(norm, 'insurancenumber', 'carteirinha', 'convenio') as string) || undefined,
    latitude: toNum(get(norm, 'latitude', 'lat')),
    longitude: toNum(get(norm, 'longitude', 'lng', 'lon')),
  }

  let patientId: string
  if (existing) {
    const updated = await PatientService.updatePatient(existing.id, data as any)
    patientId = updated.id
  } else {
    const created = await PatientService.createPatient(data as any)
    patientId = created.id
  }

  if (assignToUserId && addedById) {
    await addToCareTeam(patientId, assignToUserId, addedById, { accessLevel: 'FULL', reason: 'Importação de pacientes (vinculação automática)', isPrimary: true })
  }
}

async function main() {
  const file = getArg('--file')
  const sheetName = getArg('--sheet')
  const assignToUserId = getArg('--assignToUserId')
  const addedById = getArg('--addedById')
  if (!file) { console.error('Erro: informe --file /caminho/arquivo.(csv|xlsx)'); process.exit(1) }
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) { console.error('Arquivo não encontrado:', abs); process.exit(1) }

  let rows: Row[] = []
  if (abs.toLowerCase().endsWith('.csv')) rows = readCSV(abs)
  else if (abs.toLowerCase().endsWith('.xlsx')) rows = await readXLSX(abs, sheetName)
  else { console.error('Formato não suportado. Use CSV ou XLSX.'); process.exit(1) }

  console.log(`Iniciando importação de pacientes de ${abs}`)
  console.log(`Total de linhas: ${rows.length}`)

  let ok = 0, fail = 0
  for (const [idx, raw] of rows.entries()) {
    try {
      const norm = normalizeRow(raw)
      await upsertPatient(norm, assignToUserId, addedById)
      ok++
      if (ok % 100 === 0) console.log(`  Processados: ${ok}`)
    } catch (err) {
      fail++
      console.warn(`Falha na linha ${idx + 2}: ${(err as Error).message}`)
    }
  }

  console.log('—'.repeat(60))
  console.log('Importação concluída:')
  console.log(`  Sucesso: ${ok}`)
  console.log(`  Falhas: ${fail}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
