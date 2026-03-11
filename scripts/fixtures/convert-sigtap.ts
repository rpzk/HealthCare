#!/usr/bin/env tsx
/**
 * Script de Conversão: SIGTAP Hierárquico
 * 
 * Converte os arquivos TXT de SIGTAP (fixed-width) para estrutura hierárquica unificada.
 * 
 * Entrada:
 *   - /Fixtures/sigtap/202602/*.txt (87 arquivos)
 * 
 * Saída:
 *   - fixtures/01-master-data/sigtap/sigtap-202602-complete.json
 * 
 * Uso:
 *   npm run fixtures:convert:sigtap
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ============================================================
// INTERFACES
// ============================================================

interface FieldLayout {
  coluna: string
  tamanho: number
  inicio: number
  fim: number
  tipo: string
}

interface TableLayout {
  [tableName: string]: FieldLayout[]
}

// Estruturas normalizadas
interface NormalizedGrupo {
  code: string
  name: string
  competencia: string
}

interface NormalizedSubgrupo {
  code: string
  grupoCode: string
  name: string
  competencia: string
}

interface NormalizedFormaOrganizacao {
  code: string
  subgrupoCode: string
  grupoCode: string
  name: string
  competencia: string
}

interface NormalizedProcedimento {
  code: string
  name: string
  complexity: number | null
  sexRestriction: string | null
  qtMaximaExecucao: number | null
  qtDiasPermanencia: number | null
  qtPontos: number | null
  idadeMinima: number | null
  idadeMaxima: number | null
  valorSH: number | null
  valorSA: number | null
  valorSP: number | null
  financiamentoCode: string | null
  rubricaCode: string | null
  qtTempoPermanencia: number | null
  competencia: string
}

interface NormalizedFinanciamento {
  code: string
  name: string
  competencia: string
}

interface NormalizedRubrica {
  code: string
  name: string
  competencia: string
}

interface NormalizedModalidade {
  code: string
  name: string
  competencia: string
}

interface NormalizedCompatibilidadeCBO {
  procedureCode: string
  cboCode: string
  competencia: string
}

interface NormalizedCompatibilidadeCID {
  procedureCode: string
  cidCode: string
  competencia: string
}

interface OutputData {
  metadata: {
    source: string
    generatedAt: string
    version: string
    competencia: string
  }
  statistics: {
    grupos: number
    subgrupos: number
    formasOrganizacao: number
    procedimentos: number
    financiamentos: number
    rubricas: number
    modalidades: number
    compatibilidadesCBO: number
    compatibilidadesCID: number
  }
  data: {
    grupos: NormalizedGrupo[]
    subgrupos: NormalizedSubgrupo[]
    formasOrganizacao: NormalizedFormaOrganizacao[]
    procedimentos: NormalizedProcedimento[]
    financiamentos: NormalizedFinanciamento[]
    rubricas: NormalizedRubrica[]
    modalidades: NormalizedModalidade[]
    compatibilidadesCBO: NormalizedCompatibilidadeCBO[]
    compatibilidadesCID: NormalizedCompatibilidadeCID[]
  }
}

// ============================================================
// PATHS
// ============================================================

const FIXTURES_SOURCE = '/home/rafael/Desenvolvimento/Fixtures/sigtap/202602'
const FIXTURES_TARGET = '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/sigtap'

// ============================================================
// PARSER FIXED-WIDTH GENÉRICO
// ============================================================

function parseLayoutFile(layoutPath: string): FieldLayout[] {
  const content = fs.readFileSync(layoutPath, 'utf-8')
  const lines = content.trim().split('\n').slice(1) // Skip header
  
  return lines.map(line => {
    const [coluna, tamanho, inicio, fim, tipo] = line.split(',')
    return {
      coluna,
      tamanho: parseInt(tamanho),
      inicio: parseInt(inicio),
      fim: parseInt(fim),
      tipo
    }
  })
}

function parseFixedWidthLine(line: string, layout: FieldLayout[]): Record<string, any> {
  const record: Record<string, any> = {}
  
  for (const field of layout) {
    const value = line.substring(field.inicio - 1, field.fim).trim()
    
    if (field.tipo === 'NUMBER') {
      record[field.coluna] = value ? parseFloat(value) : null
    } else {
      record[field.coluna] = value || null
    }
  }
  
  return record
}

async function parseDataFile(dataPath: string, layout: FieldLayout[]): Promise<any[]> {
  const records: any[] = []
  
  const fileStream = fs.createReadStream(dataPath, { encoding: 'latin1' }) // Encoding brasileiro
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  
  for await (const line of rl) {
    if (line.trim()) {
      const record = parseFixedWidthLine(line, layout)
      records.push(record)
    }
  }
  
  return records
}

// ============================================================
// CONVERSORES
// ============================================================

function convertGrupos(raw: any[]): NormalizedGrupo[] {
  return raw.map(r => ({
    code: r.CO_GRUPO,
    name: r.NO_GRUPO,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertSubgrupos(raw: any[]): NormalizedSubgrupo[] {
  return raw.map(r => ({
    code: r.CO_SUB_GRUPO,
    grupoCode: r.CO_GRUPO,
    name: r.NO_SUB_GRUPO,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertFormasOrganizacao(raw: any[]): NormalizedFormaOrganizacao[] {
  return raw.map(r => ({
    code: r.CO_FORMA_ORGANIZACAO,
    subgrupoCode: r.CO_SUB_GRUPO,
    grupoCode: r.CO_GRUPO,
    name: r.NO_FORMA_ORGANIZACAO,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertProcedimentos(raw: any[]): NormalizedProcedimento[] {
  return raw.map(r => ({
    code: r.CO_PROCEDIMENTO,
    name: r.NO_PROCEDIMENTO,
    complexity: r.TP_COMPLEXIDADE ? parseInt(r.TP_COMPLEXIDADE) : null,
    sexRestriction: r.TP_SEXO || null,
    // Converter strings para números (podem vir como strings do fixed-width)
    qtMaximaExecucao: r.QT_MAXIMA_EXECUCAO ? parseInt(String(r.QT_MAXIMA_EXECUCAO)) : null,
    qtDiasPermanencia: r.QT_DIAS_PERMANENCIA ? parseInt(String(r.QT_DIAS_PERMANENCIA)) : null,
    qtPontos: r.QT_PONTOS ? parseInt(String(r.QT_PONTOS)) : null,
    idadeMinima: r.VL_IDADE_MINIMA ? parseInt(String(r.VL_IDADE_MINIMA)) : null,
    idadeMaxima: r.VL_IDADE_MAXIMA ? parseInt(String(r.VL_IDADE_MAXIMA)) : null,
    // Converter valores de centavos para inteiros (reais * 100)
    valorSH: r.VL_SH ? Math.round(r.VL_SH * 100) : null,
    valorSA: r.VL_SA ? Math.round(r.VL_SA * 100) : null,
    valorSP: r.VL_SP ? Math.round(r.VL_SP * 100) : null,
    financiamentoCode: r.CO_FINANCIAMENTO || null,
    rubricaCode: r.CO_RUBRICA || null,
    qtTempoPermanencia: r.QT_TEMPO_PERMANENCIA ? parseInt(String(r.QT_TEMPO_PERMANENCIA)) : null,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertFinanciamentos(raw: any[]): NormalizedFinanciamento[] {
  return raw.map(r => ({
    code: r.CO_FINANCIAMENTO,
    name: r.NO_FINANCIAMENTO,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertRubricas(raw: any[]): NormalizedRubrica[] {
  return raw.map(r => ({
    code: r.CO_RUBRICA,
    name: r.NO_RUBRICA,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertModalidades(raw: any[]): NormalizedModalidade[] {
  return raw.map(r => ({
    code: r.CO_MODALIDADE,
    name: r.NO_MODALIDADE,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertCompatibilidadesCBO(raw: any[]): NormalizedCompatibilidadeCBO[] {
  return raw.map(r => ({
    procedureCode: r.CO_PROCEDIMENTO,
    cboCode: r.CO_OCUPACAO,
    competencia: r.DT_COMPETENCIA
  }))
}

function convertCompatibilidadesCID(raw: any[]): NormalizedCompatibilidadeCID[] {
  return raw.map(r => ({
    procedureCode: r.CO_PROCEDIMENTO,
    cidCode: r.CO_CID,
    competencia: r.DT_COMPETENCIA
  }))
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 Iniciando conversão SIGTAP 202602...\n')
  
  // 1. Carregar layouts
  console.log('📋 Carregando layouts...')
  const layoutGrupo = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_grupo_layout.txt'))
  const layoutSubgrupo = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_sub_grupo_layout.txt'))
  const layoutForma = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_forma_organizacao_layout.txt'))
  const layoutProcedimento = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_procedimento_layout.txt'))
  const layoutFinanciamento = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_financiamento_layout.txt'))
  const layoutRubrica = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_rubrica_layout.txt'))
  const layoutModalidade = parseLayoutFile(path.join(FIXTURES_SOURCE, 'tb_modalidade_layout.txt'))
  const layoutOcupacao = parseLayoutFile(path.join(FIXTURES_SOURCE, 'rl_procedimento_ocupacao_layout.txt'))
  const layoutCID = parseLayoutFile(path.join(FIXTURES_SOURCE, 'rl_procedimento_cid_layout.txt'))
  console.log('   ✓ 9 layouts carregados\n')
  
  // 2. Parsear arquivos de dados
  console.log('📂 Parseando arquivos de dados (fixed-width)...')
  
  console.log('   Processando tb_grupo.txt...')
  const rawGrupos = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_grupo.txt'), layoutGrupo)
  console.log(`   ✓ ${rawGrupos.length} registros`)
  
  console.log('   Processando tb_sub_grupo.txt...')
  const rawSubgrupos = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_sub_grupo.txt'), layoutSubgrupo)
  console.log(`   ✓ ${rawSubgrupos.length} registros`)
  
  console.log('   Processando tb_forma_organizacao.txt...')
  const rawFormas = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_forma_organizacao.txt'), layoutForma)
  console.log(`   ✓ ${rawFormas.length} registros`)
  
  console.log('   Processando tb_procedimento.txt (pode demorar)...')
  const rawProcedimentos = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_procedimento.txt'), layoutProcedimento)
  console.log(`   ✓ ${rawProcedimentos.length} registros`)
  
  console.log('   Processando tb_financiamento.txt...')
  const rawFinanciamentos = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_financiamento.txt'), layoutFinanciamento)
  console.log(`   ✓ ${rawFinanciamentos.length} registros`)
  
  console.log('   Processando tb_rubrica.txt...')
  const rawRubricas = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_rubrica.txt'), layoutRubrica)
  console.log(`   ✓ ${rawRubricas.length} registros`)
  
  console.log('   Processando tb_modalidade.txt...')
  const rawModalidades = await parseDataFile(path.join(FIXTURES_SOURCE, 'tb_modalidade.txt'), layoutModalidade)
  console.log(`   ✓ ${rawModalidades.length} registros`)
  
  console.log('   Processando rl_procedimento_ocupacao.txt (pode demorar)...')
  const rawCBOs = await parseDataFile(path.join(FIXTURES_SOURCE, 'rl_procedimento_ocupacao.txt'), layoutOcupacao)
  console.log(`   ✓ ${rawCBOs.length} registros`)
  
  console.log('   Processando rl_procedimento_cid.txt (pode demorar)...')
  const rawCIDs = await parseDataFile(path.join(FIXTURES_SOURCE, 'rl_procedimento_cid.txt'), layoutCID)
  console.log(`   ✓ ${rawCIDs.length} registros\n`)
  
  // 3. Converter dados
  console.log('🔄 Convertendo dados...')
  const grupos = convertGrupos(rawGrupos)
  const subgrupos = convertSubgrupos(rawSubgrupos)
  const formasOrganizacao = convertFormasOrganizacao(rawFormas)
  const procedimentos = convertProcedimentos(rawProcedimentos)
  const financiamentos = convertFinanciamentos(rawFinanciamentos)
  const rubricas = convertRubricas(rawRubricas)
  const modalidades = convertModalidades(rawModalidades)
  const compatibilidadesCBO = convertCompatibilidadesCBO(rawCBOs)
  const compatibilidadesCID = convertCompatibilidadesCID(rawCIDs)
  console.log('   ✓ Conversão concluída\n')
  
  // 4. Gerar estrutura de saída
  const output: OutputData = {
    metadata: {
      source: 'SIGTAP - Sistema de Gerenciamento da Tabela de Procedimentos',
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      competencia: '202602'
    },
    statistics: {
      grupos: grupos.length,
      subgrupos: subgrupos.length,
      formasOrganizacao: formasOrganizacao.length,
      procedimentos: procedimentos.length,
      financiamentos: financiamentos.length,
      rubricas: rubricas.length,
      modalidades: modalidades.length,
      compatibilidadesCBO: compatibilidadesCBO.length,
      compatibilidadesCID: compatibilidadesCID.length
    },
    data: {
      grupos,
      subgrupos,
      formasOrganizacao,
      procedimentos,
      financiamentos,
      rubricas,
      modalidades,
      compatibilidadesCBO,
      compatibilidadesCID
    }
  }
  
  // 5. Criar diretório de saída
  if (!fs.existsSync(FIXTURES_TARGET)) {
    fs.mkdirSync(FIXTURES_TARGET, { recursive: true })
  }
  
  // 6. Salvar JSON
  const outputPath = path.join(FIXTURES_TARGET, 'sigtap-202602-complete.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  
  console.log(`✅ Conversão concluída!`)
  console.log(`📄 Arquivo gerado: ${outputPath}`)
  console.log(`📊 Tamanho: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`)
  
  // 7. Estatísticas
  console.log('📊 ESTATÍSTICAS FINAIS:')
  console.log(`   Grupos:                  ${output.statistics.grupos.toString().padStart(8)}`)
  console.log(`   Subgrupos:               ${output.statistics.subgrupos.toString().padStart(8)}`)
  console.log(`   Formas Organização:      ${output.statistics.formasOrganizacao.toString().padStart(8)}`)
  console.log(`   Procedimentos:           ${output.statistics.procedimentos.toString().padStart(8)}`)
  console.log(`   Financiamentos:          ${output.statistics.financiamentos.toString().padStart(8)}`)
  console.log(`   Rubricas:                ${output.statistics.rubricas.toString().padStart(8)}`)
  console.log(`   Modalidades:             ${output.statistics.modalidades.toString().padStart(8)}`)
  console.log(`   Compatibilidades CBO:    ${output.statistics.compatibilidadesCBO.toString().padStart(8)}`)
  console.log(`   Compatibilidades CID:    ${output.statistics.compatibilidadesCID.toString().padStart(8)}`)
  console.log(`   TOTAL:                   ${(output.statistics.grupos + output.statistics.subgrupos + output.statistics.formasOrganizacao + output.statistics.procedimentos + output.statistics.financiamentos + output.statistics.rubricas + output.statistics.modalidades + output.statistics.compatibilidadesCBO + output.statistics.compatibilidadesCID).toString().padStart(8)}\n`)
}

// Executar
main().catch(error => {
  console.error('❌ Erro durante a conversão:', error)
  process.exit(1)
})
