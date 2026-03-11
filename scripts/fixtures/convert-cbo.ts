#!/usr/bin/env tsx
/**
 * Script de Conversão: CBO Hierárquico
 * 
 * Converte os arquivos Excel de CBO para estrutura hierárquica unificada.
 * 
 * Entrada:
 *   - /Fixtures/CBO/Grande Grupo.xlsx
 *   - /Fixtures/CBO/SubGrupo Principal.xlsx
 *   - /Fixtures/CBO/SubGrupo.xlsx
 *   - /Fixtures/CBO/Familia.xlsx
 *   - /Fixtures/CBO/Ocupacao.xlsx
 *   - /Fixtures/CBO/Sinonimo.xlsx
 * 
 * Saída:
 *   - fixtures/01-master-data/cbo/cbo-complete.json
 * 
 * Uso:
 *   npm run fixtures:convert:cbo
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================
// INTERFACES
// ============================================================

interface ExcelRow {
  [key: string]: any
}

interface NormalizedGrandeGrupo {
  code: string       // "2" (1 dígito)
  name: string
  description: string
}

interface NormalizedSubgrupoPrincipal {
  code: string       // "22" (2 dígitos)
  grandeGrupoCode: string
  name: string
  description: string
}

interface NormalizedSubgrupo {
  code: string       // "223" (3 dígitos)
  subgrupoPrincipalCode: string
  grandeGrupoCode: string
  name: string
  description: string
}

interface NormalizedFamilia {
  code: string       // "2231" (4 dígitos)
  subgrupoCode: string
  name: string
  description: string
}

interface NormalizedOcupacao {
  code: string       // "223105" (6 dígitos)
  familiaCode: string
  grandeGrupoCode: string
  title: string
  description: string
}

interface NormalizedSinonimo {
  ocupacaoCode: string
  sinonimo: string
}

interface OutputData {
  metadata: {
    source: string
    generatedAt: string
    version: string
  }
  statistics: {
    grandeGrupos: number
    subgruposPrincipais: number
    subgrupos: number
    familias: number
    ocupacoes: number
    sinonimos: number
  }
  data: {
    grandeGrupos: NormalizedGrandeGrupo[]
    subgruposPrincipais: NormalizedSubgrupoPrincipal[]
    subgrupos: NormalizedSubgrupo[]
    familias: NormalizedFamilia[]
    ocupacoes: NormalizedOcupacao[]
    sinonimos: NormalizedSinonimo[]
  }
}

// ============================================================
// PATHS
// ============================================================

const FIXTURES_SOURCE = '/home/rafael/Desenvolvimento/Fixtures/CBO'
const FIXTURES_TARGET = '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/cbo'

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function loadExcel(filePath: string): ExcelRow[] {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(worksheet)
}

function extractCode(row: ExcelRow): string {
  // Tentar várias variações de nomes de coluna
  const possibleKeys = ['codigo', 'código', 'Codigo', 'Código', 'CODIGO', 'CÓDIGO', 'code', 'Code', 'CODE']
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim()
    }
  }
  // Se não encontrar, pegar a primeira coluna
  const firstKey = Object.keys(row)[0]
  return String(row[firstKey]).trim()
}

function extractName(row: ExcelRow): string {
  const possibleKeys = ['titulo', 'título', 'Titulo', 'Título', 'TITULO', 'TÍTULO', 'nome', 'Nome', 'NOME', 'name', 'Name', 'NAME', 'descricao', 'descrição', 'Descricao', 'Descrição']
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
      return String(row[key]).trim()
    }
  }
  // Se não encontrar, pegar a segunda coluna
  const keys = Object.keys(row)
  if (keys.length > 1) {
    return String(row[keys[1]]).trim()
  }
  return ''
}

function extractDescription(row: ExcelRow): string {
  const possibleKeys = ['descricao', 'descrição', 'Descricao', 'Descrição', 'DESCRICAO', 'DESCRIÇÃO', 'description', 'Description', 'DESCRIPTION']
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
      return String(row[key]).trim()
    }
  }
  return ''
}

// ============================================================
// FUNÇÕES DE CONVERSÃO
// ============================================================

function convertGrandeGrupos(raw: ExcelRow[]): NormalizedGrandeGrupo[] {
  return raw.map(row => {
    const code = extractCode(row)
    const name = extractName(row)
    const description = extractDescription(row) || name
    
    return {
      code,
      name,
      description
    }
  }).filter(item => item.code && item.name)
}

function convertSubgruposPrincipais(raw: ExcelRow[]): NormalizedSubgrupoPrincipal[] {
  return raw.map(row => {
    const code = extractCode(row)
    const name = extractName(row)
    const description = extractDescription(row) || name
    const grandeGrupoCode = code.substring(0, 1)
    
    return {
      code,
      grandeGrupoCode,
      name,
      description
    }
  }).filter(item => item.code && item.name)
}

function convertSubgrupos(raw: ExcelRow[]): NormalizedSubgrupo[] {
  return raw.map(row => {
    const code = extractCode(row)
    const name = extractName(row)
    const description = extractDescription(row) || name
    const subgrupoPrincipalCode = code.substring(0, 2)
    const grandeGrupoCode = code.substring(0, 1)
    
    return {
      code,
      subgrupoPrincipalCode,
      grandeGrupoCode,
      name,
      description
    }
  }).filter(item => item.code && item.name)
}

function convertFamilias(raw: ExcelRow[]): NormalizedFamilia[] {
  return raw.map(row => {
    const code = extractCode(row)
    const name = extractName(row)
    const description = extractDescription(row) || name
    const subgrupoCode = code.substring(0, 3)
    
    return {
      code,
      subgrupoCode,
      name,
      description
    }
  }).filter(item => item.code && item.name)
}

function convertOcupacoes(raw: ExcelRow[]): NormalizedOcupacao[] {
  return raw.map(row => {
    const code = extractCode(row)
    const title = extractName(row)
    const description = extractDescription(row) || title
    const familiaCode = code.substring(0, 4)
    const grandeGrupoCode = code.substring(0, 1)
    
    return {
      code,
      familiaCode,
      grandeGrupoCode,
      title,
      description
    }
  }).filter(item => item.code && item.title)
}

function convertSinonimos(raw: ExcelRow[]): NormalizedSinonimo[] {
  const sinonimos: NormalizedSinonimo[] = []
  
  for (const row of raw) {
    const ocupacaoCode = extractCode(row)
    const sinonimo = extractName(row)
    
    if (ocupacaoCode && sinonimo) {
      sinonimos.push({
        ocupacaoCode,
        sinonimo
      })
    }
  }
  
  return sinonimos
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 Iniciando conversão CBO...\n')
  
  // 1. Carregar arquivos fonte
  console.log('📂 Carregando arquivos Excel...')
  const rawGrandeGrupos = loadExcel(path.join(FIXTURES_SOURCE, 'Grande Grupo.xlsx'))
  const rawSubgruposPrincipais = loadExcel(path.join(FIXTURES_SOURCE, 'SubGrupo Principal.xlsx'))
  const rawSubgrupos = loadExcel(path.join(FIXTURES_SOURCE, 'SubGrupo.xlsx'))
  const rawFamilias = loadExcel(path.join(FIXTURES_SOURCE, 'Familia.xlsx'))
  const rawOcupacoes = loadExcel(path.join(FIXTURES_SOURCE, 'Ocupacao.xlsx'))
  const rawSinonimos = loadExcel(path.join(FIXTURES_SOURCE, 'Sinonimo.xlsx'))
  
  console.log(`   ✓ Grande Grupos: ${rawGrandeGrupos.length} linhas`)
  console.log(`   ✓ Subgrupos Principais: ${rawSubgruposPrincipais.length} linhas`)
  console.log(`   ✓ Subgrupos: ${rawSubgrupos.length} linhas`)
  console.log(`   ✓ Famílias: ${rawFamilias.length} linhas`)
  console.log(`   ✓ Ocupações: ${rawOcupacoes.length} linhas`)
  console.log(`   ✓ Sinônimos: ${rawSinonimos.length} linhas\n`)
  
  // 2. Converter dados
  console.log('🔄 Convertendo dados...')
  const grandeGrupos = convertGrandeGrupos(rawGrandeGrupos)
  const subgruposPrincipais = convertSubgruposPrincipais(rawSubgruposPrincipais)
  const subgrupos = convertSubgrupos(rawSubgrupos)
  const familias = convertFamilias(rawFamilias)
  const ocupacoes = convertOcupacoes(rawOcupacoes)
  const sinonimos = convertSinonimos(rawSinonimos)
  
  console.log(`   ✓ Grande Grupos processados: ${grandeGrupos.length}`)
  console.log(`   ✓ Subgrupos Principais processados: ${subgruposPrincipais.length}`)
  console.log(`   ✓ Subgrupos processados: ${subgrupos.length}`)
  console.log(`   ✓ Famílias processadas: ${familias.length}`)
  console.log(`   ✓ Ocupações processadas: ${ocupacoes.length}`)
  console.log(`   ✓ Sinônimos processados: ${sinonimos.length}\n`)
  
  // 3. Gerar estrutura de saída
  const output: OutputData = {
    metadata: {
      source: 'CBO (Classificação Brasileira de Ocupações)',
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    statistics: {
      grandeGrupos: grandeGrupos.length,
      subgruposPrincipais: subgruposPrincipais.length,
      subgrupos: subgrupos.length,
      familias: familias.length,
      ocupacoes: ocupacoes.length,
      sinonimos: sinonimos.length
    },
    data: {
      grandeGrupos,
      subgruposPrincipais,
      subgrupos,
      familias,
      ocupacoes,
      sinonimos
    }
  }
  
  // 4. Criar diretório de saída se não existir
  if (!fs.existsSync(FIXTURES_TARGET)) {
    fs.mkdirSync(FIXTURES_TARGET, { recursive: true })
  }
  
  // 5. Salvar JSON
  const outputPath = path.join(FIXTURES_TARGET, 'cbo-complete.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  
  console.log(`✅ Conversão concluída!`)
  console.log(`📄 Arquivo gerado: ${outputPath}`)
  console.log(`📊 Tamanho: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`)
  
  // 6. Estatísticas
  console.log('📊 ESTATÍSTICAS FINAIS:')
  console.log(`   Grande Grupos:          ${output.statistics.grandeGrupos.toString().padStart(6)}`)
  console.log(`   Subgrupos Principais:   ${output.statistics.subgruposPrincipais.toString().padStart(6)}`)
  console.log(`   Subgrupos:              ${output.statistics.subgrupos.toString().padStart(6)}`)
  console.log(`   Famílias:               ${output.statistics.familias.toString().padStart(6)}`)
  console.log(`   Ocupações:              ${output.statistics.ocupacoes.toString().padStart(6)}`)
  console.log(`   Sinônimos:              ${output.statistics.sinonimos.toString().padStart(6)}`)
  console.log(`   TOTAL:                  ${(output.statistics.grandeGrupos + output.statistics.subgruposPrincipais + output.statistics.subgrupos + output.statistics.familias + output.statistics.ocupacoes + output.statistics.sinonimos).toString().padStart(6)}\n`)
}

// Executar
main().catch(error => {
  console.error('❌ Erro durante a conversão:', error)
  process.exit(1)
})
