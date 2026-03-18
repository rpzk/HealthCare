#!/usr/bin/env tsx
/**
 * Atualiza a tabela SIGTAP a partir da fonte oficial DATASUS.
 *
 * Pipeline completo:
 *   1. Detecta a competência mais recente (ou usa --competencia YYYYMM)
 *   2. Baixa TUP{YYYYMM}.zip do FTP público DATASUS
 *   3. Extrai os arquivos TXT fixed-width
 *   4. Converte para JSON normalizado
 *   5. Importa no PostgreSQL (upsert — idempotente)
 *   6. Registra a versão carregada no banco
 *
 * Uso:
 *   npm run sigtap:update                          # detecta última competência
 *   npm run sigtap:update -- --competencia 202603  # competência específica
 *   npm run sigtap:update -- --only-import         # só importa JSON já existente
 *   npm run sigtap:update -- --skip-import         # baixa+converte, sem importar
 *
 * Dependências de sistema no container:
 *   curl, unzip  (já presentes nas imagens node:*-slim e node:*-alpine + apk add)
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { execSync, execFileSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as os from 'os'

// ─── Config ──────────────────────────────────────────────────────────────────

const DATASUS_FTP_BASE = 'ftp://ftp.datasus.gov.br/public/sistemas/tup'
const FIXTURES_SIGTAP = path.join(process.cwd(), 'fixtures', '01-master-data', 'sigtap')

const args = process.argv.slice(2)
const ONLY_IMPORT = args.includes('--only-import')
const SKIP_IMPORT = args.includes('--skip-import')
const FORCE = args.includes('--force')

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

const COMPETENCIA_ARG = getArgValue('--competencia')

// ─── Prisma ──────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL não configurado')

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna a competência a testar em ordem decrescente (mês atual, anterior, 2 meses atrás). */
function candidateCompetencias(): string[] {
  const now = new Date()
  const candidates: string[] = []
  for (let delta = 0; delta <= 2; delta++) {
    const d = new Date(now.getFullYear(), now.getMonth() - delta, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    candidates.push(`${yyyy}${mm}`)
  }
  return candidates
}

function sigtapJsonPath(competencia: string) {
  return path.join(FIXTURES_SIGTAP, `sigtap-${competencia}-complete.json`)
}

/** Verifica se um arquivo existe no FTP DATASUS (curl --head). */
function ftpFileExists(competencia: string): boolean {
  const url = `${DATASUS_FTP_BASE}/TUP${competencia}.zip`
  try {
    execFileSync('curl', ['--silent', '--head', '--fail', '--max-time', '15', url], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/** Detecta a competência mais recente disponível no DATASUS FTP. */
async function detectLatestCompetencia(): Promise<string> {
  console.log('   Detectando competência mais recente no DATASUS...')
  for (const c of candidateCompetencias()) {
    process.stdout.write(`   Testando ${c}... `)
    if (ftpFileExists(c)) {
      console.log('disponível ✓')
      return c
    }
    console.log('não disponível')
  }
  throw new Error(
    'Não foi possível detectar competência disponível no DATASUS. ' +
    'Use --competencia YYYYMM para especificar manualmente.',
  )
}

/** Baixa o ZIP do DATASUS para um arquivo temporário. */
function downloadSigtap(competencia: string, destZip: string): void {
  const url = `${DATASUS_FTP_BASE}/TUP${competencia}.zip`
  console.log(`\n   Baixando: ${url}`)
  console.log(`   Destino:  ${destZip}`)
  try {
    execFileSync(
      'curl',
      ['--progress-bar', '--fail', '--retry', '3', '--retry-delay', '5',
       '--max-time', '300', '-o', destZip, url],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    )
  } catch {
    throw new Error(
      `Falha ao baixar SIGTAP ${competencia}. Verifique conectividade com ftp.datasus.gov.br\n` +
      `Você também pode baixar manualmente em: ${url}\n` +
      `e colocar em: ${destZip}\n` +
      `Depois execute: npm run sigtap:update -- --only-import --competencia ${competencia}`,
    )
  }
  const sizeMB = (fs.statSync(destZip).size / 1024 / 1024).toFixed(1)
  console.log(`   Download concluído (${sizeMB} MB)`)
}

/** Extrai o ZIP para um diretório temporário. */
function extractZip(zipPath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true })
  try {
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', destDir])
  } catch (err: any) {
    // Alguns builds têm apenas 'unzip' como comando diferente
    try {
      execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' })
    } catch {
      throw new Error(
        `'unzip' não encontrado. Instale com:\n` +
        `  Debian/Ubuntu: apt-get install unzip\n` +
        `  Alpine:        apk add unzip\n` +
        `  macOS:         brew install unzip\n`,
      )
    }
  }
}

// ─── Parser fixed-width ──────────────────────────────────────────────────────

interface FieldLayout { coluna: string; tamanho: number; inicio: number; fim: number; tipo: string }

function parseLayoutFile(layoutPath: string): FieldLayout[] {
  const content = fs.readFileSync(layoutPath, 'utf-8')
  return content.trim().split('\n').slice(1).map(line => {
    const [coluna, tamanho, inicio, fim, tipo] = line.split(',')
    return { coluna, tamanho: +tamanho, inicio: +inicio, fim: +fim, tipo }
  })
}

function parseFixedWidthLine(line: string, layout: FieldLayout[]): Record<string, any> {
  const r: Record<string, any> = {}
  for (const f of layout) {
    const v = line.substring(f.inicio - 1, f.fim).trim()
    r[f.coluna] = f.tipo === 'NUMBER' ? (v ? parseFloat(v) : null) : (v || null)
  }
  return r
}

async function parseDataFile(dataPath: string, layout: FieldLayout[]): Promise<any[]> {
  const records: any[] = []
  const rl = readline.createInterface({
    input: fs.createReadStream(dataPath, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    if (line.trim()) records.push(parseFixedWidthLine(line, layout))
  }
  return records
}

// ─── Conversão ───────────────────────────────────────────────────────────────

async function convertSigtap(sourceDir: string, competencia: string): Promise<object> {
  console.log('\n2. Convertendo arquivos TXT fixed-width...')

  const lay = (name: string) => parseLayoutFile(path.join(sourceDir, `${name}_layout.txt`))
  const dat = (name: string, layout: FieldLayout[]) => parseDataFile(path.join(sourceDir, `${name}.txt`), layout)

  // Layouts
  const [lGrupo, lSubgrupo, lForma, lProc, lFin, lRub, lMod, lOcup, lCID] = await Promise.all([
    Promise.resolve(lay('tb_grupo')),
    Promise.resolve(lay('tb_sub_grupo')),
    Promise.resolve(lay('tb_forma_organizacao')),
    Promise.resolve(lay('tb_procedimento')),
    Promise.resolve(lay('tb_financiamento')),
    Promise.resolve(lay('tb_rubrica')),
    Promise.resolve(lay('tb_modalidade')),
    Promise.resolve(lay('rl_procedimento_ocupacao')),
    Promise.resolve(lay('rl_procedimento_cid')),
  ])

  // Data
  console.log('   Parseando arquivos (pode demorar ~1 min)...')
  const [rawGrupos, rawSubgrupos, rawFormas, rawProcs, rawFins, rawRubs, rawMods, rawCBOs, rawCIDs] =
    await Promise.all([
      dat('tb_grupo', lGrupo),
      dat('tb_sub_grupo', lSubgrupo),
      dat('tb_forma_organizacao', lForma),
      dat('tb_procedimento', lProc),
      dat('tb_financiamento', lFin),
      dat('tb_rubrica', lRub),
      dat('tb_modalidade', lMod),
      dat('rl_procedimento_ocupacao', lOcup),
      dat('rl_procedimento_cid', lCID),
    ])

  const grupos       = rawGrupos.map(r => ({ code: r.CO_GRUPO, name: r.NO_GRUPO, competencia: r.DT_COMPETENCIA }))
  const subgrupos    = rawSubgrupos.map(r => ({ code: r.CO_SUB_GRUPO, grupoCode: r.CO_GRUPO, name: r.NO_SUB_GRUPO, competencia: r.DT_COMPETENCIA }))
  const formas       = rawFormas.map(r => ({ code: r.CO_FORMA_ORGANIZACAO, subgrupoCode: r.CO_SUB_GRUPO, grupoCode: r.CO_GRUPO, name: r.NO_FORMA_ORGANIZACAO, competencia: r.DT_COMPETENCIA }))
  const financiamentos = rawFins.map(r => ({ code: r.CO_FINANCIAMENTO, name: r.NO_FINANCIAMENTO, competencia: r.DT_COMPETENCIA }))
  const rubricas     = rawRubs.map(r => ({ code: r.CO_RUBRICA, name: r.NO_RUBRICA, competencia: r.DT_COMPETENCIA }))
  const modalidades  = rawMods.map(r => ({ code: r.CO_MODALIDADE, name: r.NO_MODALIDADE, competencia: r.DT_COMPETENCIA }))
  const procedimentos = rawProcs.map(r => ({
    code: r.CO_PROCEDIMENTO,
    name: r.NO_PROCEDIMENTO,
    complexity: r.TP_COMPLEXIDADE ? +r.TP_COMPLEXIDADE : null,
    sexRestriction: r.TP_SEXO || null,
    qtMaximaExecucao: r.QT_MAXIMA_EXECUCAO ? +String(r.QT_MAXIMA_EXECUCAO) : null,
    qtDiasPermanencia: r.QT_DIAS_PERMANENCIA ? +String(r.QT_DIAS_PERMANENCIA) : null,
    qtPontos: r.QT_PONTOS ? +String(r.QT_PONTOS) : null,
    idadeMinima: r.VL_IDADE_MINIMA ? +String(r.VL_IDADE_MINIMA) : null,
    idadeMaxima: r.VL_IDADE_MAXIMA ? +String(r.VL_IDADE_MAXIMA) : null,
    valorSH: r.VL_SH ? Math.round(r.VL_SH * 100) : null,
    valorSA: r.VL_SA ? Math.round(r.VL_SA * 100) : null,
    valorSP: r.VL_SP ? Math.round(r.VL_SP * 100) : null,
    financiamentoCode: r.CO_FINANCIAMENTO || null,
    rubricaCode: r.CO_RUBRICA || null,
    qtTempoPermanencia: r.QT_TEMPO_PERMANENCIA ? +String(r.QT_TEMPO_PERMANENCIA) : null,
    competencia: r.DT_COMPETENCIA,
  }))
  const compatibilidadesCBO = rawCBOs.map(r => ({ procedureCode: r.CO_PROCEDIMENTO, cboCode: r.CO_OCUPACAO, competencia: r.DT_COMPETENCIA }))
  const compatibilidadesCID = rawCIDs.map(r => ({ procedureCode: r.CO_PROCEDIMENTO, cidCode: r.CO_CID, competencia: r.DT_COMPETENCIA }))

  const output = {
    metadata: {
      source: 'SIGTAP - Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos e OPM do SUS',
      generatedAt: new Date().toISOString(),
      competencia,
    },
    statistics: {
      grupos: grupos.length, subgrupos: subgrupos.length,
      formasOrganizacao: formas.length, procedimentos: procedimentos.length,
      financiamentos: financiamentos.length, rubricas: rubricas.length,
      modalidades: modalidades.length,
      compatibilidadesCBO: compatibilidadesCBO.length,
      compatibilidadesCID: compatibilidadesCID.length,
    },
    data: { grupos, subgrupos, formasOrganizacao: formas, procedimentos, financiamentos, rubricas, modalidades, compatibilidadesCBO, compatibilidadesCID },
  }

  console.log(`   ✓ ${procedimentos.length} procedimentos, ${compatibilidadesCBO.length} compat. CBO, ${compatibilidadesCID.length} compat. CID`)
  return output
}

// ─── Importação ──────────────────────────────────────────────────────────────

async function batchUpsert<T>(label: string, data: T[], fn: (item: T) => Promise<any>, batchSize = 500) {
  let ok = 0, err = 0
  for (let i = 0; i < data.length; i += batchSize) {
    const results = await Promise.allSettled(data.slice(i, i + batchSize).map(fn))
    results.forEach(r => r.status === 'fulfilled' ? ok++ : err++)
    const pct = (((i + batchSize) / data.length) * 100).toFixed(0)
    if (i % (batchSize * 10) === 0 || i + batchSize >= data.length)
      process.stdout.write(`\r   ${label}: ${ok}/${data.length} (${pct}%) ${err > 0 ? `⚠️ ${err} erros` : ''}    `)
  }
  console.log()
}

async function importSigtapData(data: any) {
  console.log('\n3. Importando no banco (pode demorar ~10 min)...')

  // Limpar dados SIGTAP existentes (FK-safe order)
  console.log('   Limpando dados anteriores...')
  await prisma.procedureCIDCompatibility.deleteMany({})
  await prisma.procedureCBOCompatibility.deleteMany({})
  await prisma.sIGTAPProcedimento.deleteMany({})
  await prisma.sIGTAPFormaOrganizacao.deleteMany({})
  await prisma.sIGTAPSubgrupo.deleteMany({})
  await prisma.sIGTAPGrupo.deleteMany({})
  await prisma.sIGTAPModalidade.deleteMany({})
  await prisma.sIGTAPRubrica.deleteMany({})
  await prisma.sIGTAPFinanciamento.deleteMany({})

  const { grupos, subgrupos, formasOrganizacao, procedimentos, financiamentos, rubricas, modalidades, compatibilidadesCBO, compatibilidadesCID } = data

  await batchUpsert('Grupos', grupos, (item: any) =>
    prisma.sIGTAPGrupo.create({ data: { code: item.code, name: item.name } }))

  await batchUpsert('Subgrupos', subgrupos, async (item: any) => {
    const grupo = await prisma.sIGTAPGrupo.findUnique({ where: { code: item.grupoCode } })
    if (!grupo) return
    return prisma.sIGTAPSubgrupo.create({ data: { code: item.code, name: item.name, grupoId: grupo.id } })
  })

  await batchUpsert('Formas Organização', formasOrganizacao, async (item: any) => {
    const subgrupo = await prisma.sIGTAPSubgrupo.findUnique({ where: { code: item.subgrupoCode } })
    if (!subgrupo) return
    return prisma.sIGTAPFormaOrganizacao.create({ data: { code: item.code, name: item.name, subgrupoId: subgrupo.id } })
  })

  await batchUpsert('Financiamentos', financiamentos, (item: any) =>
    prisma.sIGTAPFinanciamento.create({ data: { code: item.code, name: item.name } }))

  await batchUpsert('Rubricas', rubricas, (item: any) =>
    prisma.sIGTAPRubrica.create({ data: { code: item.code, name: item.name } }))

  await batchUpsert('Modalidades', modalidades, (item: any) =>
    prisma.sIGTAPModalidade.create({ data: { code: item.code, name: item.name } }))

  await batchUpsert('Procedimentos', procedimentos, async (item: any) => {
    const grupoCode = item.code.substring(0, 2)
    const subgrupoCode = item.code.substring(0, 4)
    const formaCode = item.code.substring(0, 6)
    const [grupo, subgrupo, forma, financiamento, rubrica] = await Promise.all([
      prisma.sIGTAPGrupo.findUnique({ where: { code: grupoCode } }),
      prisma.sIGTAPSubgrupo.findUnique({ where: { code: subgrupoCode } }),
      prisma.sIGTAPFormaOrganizacao.findUnique({ where: { code: formaCode } }),
      item.financiamentoCode ? prisma.sIGTAPFinanciamento.findUnique({ where: { code: item.financiamentoCode } }) : null,
      item.rubricaCode ? prisma.sIGTAPRubrica.findUnique({ where: { code: item.rubricaCode } }) : null,
    ])
    return prisma.sIGTAPProcedimento.create({
      data: {
        code: item.code, name: item.name,
        grupoId: grupo?.id, subgrupoId: subgrupo?.id, formaOrganizacaoId: forma?.id,
        financiamentoId: financiamento?.id, rubricaId: rubrica?.id,
        valorSH: item.valorSH, valorSA: item.valorSA, valorSP: item.valorSP,
        complexity: item.complexity, minAge: item.idadeMinima, maxAge: item.idadeMaxima,
        sexRestriction: item.sexRestriction, qtMaximaExecucao: item.qtMaximaExecucao,
        qtDiasPermanencia: item.qtDiasPermanencia, competencia: item.competencia,
      },
    })
  }, 50)

  await batchUpsert('Compat. CBO', compatibilidadesCBO, async (item: any) => {
    const proc = await prisma.sIGTAPProcedimento.findUnique({ where: { code: item.procedureCode } })
    if (!proc) return
    return prisma.procedureCBOCompatibility.create({
      data: { procedureId: proc.id, occupationCode: item.cboCode, type: 'PERMITIDA', competencia: item.competencia },
    })
  }, 200)

  await batchUpsert('Compat. CID', compatibilidadesCID, async (item: any) => {
    const proc = await prisma.sIGTAPProcedimento.findUnique({ where: { code: item.procedureCode } })
    if (!proc) return
    return prisma.procedureCIDCompatibility.create({
      data: { procedureId: proc.id, cidCode: item.cidCode, type: 'PERMITIDA', competencia: item.competencia },
    })
  }, 200)
}

// ─── Versão no banco ──────────────────────────────────────────────────────────

async function saveVersionRecord(competencia: string) {
  // Usa SystemSetting para armazenar a versão do SIGTAP carregado
  await (prisma as any).systemSetting.upsert({
    where: { key: 'sigtap_competencia' },
    update: { value: competencia, updatedAt: new Date() },
    create: { key: 'sigtap_competencia', value: competencia },
  }).catch(() => {
    // SystemSetting pode não ter este campo — ignora silenciosamente
  })
}

async function getLoadedCompetencia(): Promise<string | null> {
  try {
    const setting = await (prisma as any).systemSetting.findUnique({ where: { key: 'sigtap_competencia' } })
    return setting?.value ?? null
  } catch {
    return null
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const SEP = '='.repeat(60)
  console.log(`\n${SEP}`)
  console.log('SIGTAP UPDATER — DATASUS')
  console.log(SEP)

  let competencia: string

  if (COMPETENCIA_ARG) {
    competencia = COMPETENCIA_ARG
    console.log(`\n   Competência: ${competencia} (especificada via --competencia)`)
  } else {
    competencia = await detectLatestCompetencia()
  }

  const jsonPath = sigtapJsonPath(competencia)

  // Verificar se já está carregada
  if (!FORCE && !ONLY_IMPORT) {
    const loaded = await getLoadedCompetencia()
    if (loaded === competencia) {
      console.log(`\n   ✓ SIGTAP ${competencia} já está carregado no banco.`)
      console.log('   Use --force para reimportar.')
      return
    }
  }

  // ── Etapa 1: Download + Extração ──────────────────────────────────────────
  if (!ONLY_IMPORT) {
    console.log('\n1. Download do DATASUS...')

    const tmpDir = path.join(os.tmpdir(), `sigtap_${competencia}_${Date.now()}`)
    const zipPath = path.join(tmpDir, `TUP${competencia}.zip`)
    fs.mkdirSync(tmpDir, { recursive: true })

    try {
      downloadSigtap(competencia, zipPath)

      const extractDir = path.join(tmpDir, 'extracted')
      console.log('\n   Extraindo ZIP...')
      extractZip(zipPath, extractDir)

      // Os arquivos podem estar dentro de uma subpasta no ZIP
      let sourceDir = extractDir
      const subdirs = fs.readdirSync(extractDir).filter(f =>
        fs.statSync(path.join(extractDir, f)).isDirectory()
      )
      if (subdirs.length === 1 && fs.existsSync(path.join(extractDir, subdirs[0], 'tb_grupo.txt'))) {
        sourceDir = path.join(extractDir, subdirs[0])
      }

      // ── Etapa 2: Conversão ──────────────────────────────────────────────
      const output = await convertSigtap(sourceDir, competencia)

      // Salvar JSON convertido
      fs.mkdirSync(FIXTURES_SIGTAP, { recursive: true })
      fs.writeFileSync(jsonPath, JSON.stringify(output), 'utf-8')
      const sizeMB = (fs.statSync(jsonPath).size / 1024 / 1024).toFixed(1)
      console.log(`   ✓ JSON salvo: ${jsonPath} (${sizeMB} MB)`)

    } finally {
      // Limpar temporários
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }

  // ── Etapa 3: Importação ─────────────────────────────────────────────────
  if (!SKIP_IMPORT) {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(
        `JSON não encontrado: ${jsonPath}\n` +
        `Execute sem --only-import para baixar e converter primeiro.`,
      )
    }

    console.log(`\n   Lendo ${path.basename(jsonPath)}...`)
    const sigtapData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    await importSigtapData(sigtapData.data)
    await saveVersionRecord(competencia)
  }

  console.log(`\n${SEP}`)
  console.log(`✓ SIGTAP ${competencia} atualizado com sucesso!`)
  console.log(SEP + '\n')
}

main()
  .catch(err => { console.error('\n❌ Erro:', err.message); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
