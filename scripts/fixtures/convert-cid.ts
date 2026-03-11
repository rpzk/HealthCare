#!/usr/bin/env tsx
/**
 * Script de Conversão: CID-10 Hierárquico
 * 
 * Converte os arquivos JSON de CID-10 para estrutura hierárquica unificada.
 * 
 * Entrada:
 *   - /Fixtures/CID10/CID10 - Capitulos.json
 *   - /Fixtures/CID10/CID10 - Grupos.json
 *   - /Fixtures/CID10/Categoria.json
 *   - /Fixtures/CID10/CID10_SubCategoria.json
 * 
 * Saída:
 *   - fixtures/01-master-data/cid10/cid10-complete.json
 * 
 * Uso:
 *   npm run fixtures:convert:cid
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================
// INTERFACES
// ============================================================

interface Capitulo {
  id: string
  chapter: string
  initial: string
  final: string
  long_name: string
  short_name: string
}

interface Grupo {
  id: string
  chapter: string
  initial: string
  final: string
  long_name: string
  short_name: string
}

interface Categoria {
  model: string
  pk: number
  fields: {
    chapter: number
    group: number[]
    code: string
    long_name: string
    short_name: string
  }
}

interface Subcategoria {
  model: string
  pk: number
  fields: {
    category: number
    code: number
    long_name: string
    short_name: string
    manifestation: null | string
    mortality: null | string
    genre: null | string
  }
}

// Estrutura de saída normalizada
interface NormalizedCapitulo {
  code: string       // "I" (romano)
  initial: string    // "A00"
  final: string      // "B99"
  name: string
  description: string
}

interface NormalizedGrupo {
  code: string       // "A00-A09"
  capituloCode: string
  initial: string
  final: string
  name: string
  description: string
}

interface NormalizedCategoria {
  code: string       // "A00"
  grupoCode?: string
  capituloCode?: string
  name: string
  description: string
}

interface NormalizedSubcategoria {
  code: string       // "A00.0"
  categoriaCode: string // "A00"
  name: string
  description: string
}

interface OutputData {
  metadata: {
    source: string
    generatedAt: string
    version: string
  }
  statistics: {
    capitulos: number
    grupos: number
    categorias: number
    subcategorias: number
  }
  data: {
    capitulos: NormalizedCapitulo[]
    grupos: NormalizedGrupo[]
    categorias: NormalizedCategoria[]
    subcategorias: NormalizedSubcategoria[]
  }
}

// ============================================================
// PATHS
// ============================================================

const FIXTURES_SOURCE = '/home/rafael/Desenvolvimento/Fixtures/CID10'
const FIXTURES_TARGET = '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/cid10'

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function loadJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

function extractGrupoCode(initial: string, final: string): string {
  return `${initial}-${final}`
}

function getCapituloCodeFromCID(cidCode: string): string {
  const firstChar = cidCode.charAt(0)
  const ranges: Record<string, string> = {
    'A': 'I', 'B': 'I',
    'C': 'II', 'D': 'III',
    'E': 'IV',
    'F': 'V',
    'G': 'VI',
    'H': 'VII',
    'I': 'IX',
    'J': 'X',
    'K': 'XI',
    'L': 'XII',
    'M': 'XIII',
    'N': 'XIV',
    'O': 'XV',
    'P': 'XVI',
    'Q': 'XVII',
    'R': 'XVIII',
    'S': 'XIX', 'T': 'XIX',
    'U': 'XXII',
    'V': 'XX', 'W': 'XX', 'X': 'XX', 'Y': 'XX',
    'Z': 'XXI'
  }
  return ranges[firstChar] || 'UNKNOWN'
}

function findGrupoForCategoria(categoriaCode: string, grupos: NormalizedGrupo[]): string | undefined {
  for (const grupo of grupos) {
    if (categoriaCode >= grupo.initial && categoriaCode <= grupo.final) {
      return grupo.code
    }
  }
  return undefined
}

// ============================================================
// FUNÇÕES DE CONVERSÃO
// ============================================================

function convertCapitulos(raw: Capitulo[]): NormalizedCapitulo[] {
  return raw.map(cap => ({
    code: cap.chapter.trim(),
    initial: cap.initial,
    final: cap.final,
    name: cap.short_name || cap.long_name,
    description: cap.long_name
  }))
}

function convertGrupos(raw: Grupo[], capitulos: NormalizedCapitulo[]): NormalizedGrupo[] {
  return raw.map(grupo => {
    const capituloCode = getCapituloCodeFromCID(grupo.initial)
    
    return {
      code: extractGrupoCode(grupo.initial, grupo.final),
      capituloCode,
      initial: grupo.initial,
      final: grupo.final,
      name: grupo.short_name || grupo.long_name,
      description: grupo.long_name
    }
  })
}

function convertCategorias(raw: Categoria[], grupos: NormalizedGrupo[]): NormalizedCategoria[] {
  return raw.map(cat => {
    const code = cat.fields.code
    const capituloCode = getCapituloCodeFromCID(code)
    const grupoCode = findGrupoForCategoria(code, grupos)
    
    return {
      code,
      grupoCode,
      capituloCode,
      name: cat.fields.short_name || cat.fields.long_name,
      description: cat.fields.long_name
    }
  })
}

function convertSubcategorias(raw: Subcategoria[], categorias: NormalizedCategoria[]): NormalizedSubcategoria[] {
  return raw.map(sub => {
    // Buscar a categoria pelo pk
    const categoria = categorias[sub.fields.category - 1]
    if (!categoria) {
      console.warn(`⚠️ Categoria não encontrada para subcategoria pk=${sub.pk}`)
      return null
    }
    
    const fullCode = `${categoria.code}.${sub.fields.code}`
    
    return {
      code: fullCode,
      categoriaCode: categoria.code,
      name: sub.fields.short_name || sub.fields.long_name,
      description: sub.fields.long_name
    }
  }).filter(Boolean) as NormalizedSubcategoria[]
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 Iniciando conversão CID-10...\n')
  
  // 1. Carregar arquivos fonte
  console.log('📂 Carregando arquivos fonte...')
  const rawCapitulos = loadJSON<Capitulo[]>(path.join(FIXTURES_SOURCE, 'CID10 - Capitulos.json'))
  const rawGrupos = loadJSON<Grupo[]>(path.join(FIXTURES_SOURCE, 'CID10 - Grupos.json'))
  const rawCategorias = loadJSON<Categoria[]>(path.join(FIXTURES_SOURCE, 'Categoria.json'))
  const rawSubcategorias = loadJSON<Subcategoria[]>(path.join(FIXTURES_SOURCE, 'CID10_SubCategoria.json'))
  
  console.log(`   ✓ Capítulos: ${rawCapitulos.length}`)
  console.log(`   ✓ Grupos: ${rawGrupos.length}`)
  console.log(`   ✓ Categorias: ${rawCategorias.length}`)
  console.log(`   ✓ Subcategorias: ${rawSubcategorias.length}\n`)
  
  // 2. Converter dados
  console.log('🔄 Convertendo dados...')
  const capitulos = convertCapitulos(rawCapitulos)
  const grupos = convertGrupos(rawGrupos, capitulos)
  const categorias = convertCategorias(rawCategorias, grupos)
  const subcategorias = convertSubcategorias(rawSubcategorias, categorias)
  
  console.log(`   ✓ Capítulos processados: ${capitulos.length}`)
  console.log(`   ✓ Grupos processados: ${grupos.length}`)
  console.log(`   ✓ Categorias processadas: ${categorias.length}`)
  console.log(`   ✓ Subcategorias processadas: ${subcategorias.length}\n`)
  
  // 3. Gerar estrutura de saída
  const output: OutputData = {
    metadata: {
      source: 'CID-10 OMS/DATASUS',
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    statistics: {
      capitulos: capitulos.length,
      grupos: grupos.length,
      categorias: categorias.length,
      subcategorias: subcategorias.length
    },
    data: {
      capitulos,
      grupos,
      categorias,
      subcategorias
    }
  }
  
  // 4. Criar diretório de saída se não existir
  if (!fs.existsSync(FIXTURES_TARGET)) {
    fs.mkdirSync(FIXTURES_TARGET, { recursive: true })
  }
  
  // 5. Salvar JSON
  const outputPath = path.join(FIXTURES_TARGET, 'cid10-complete.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  
  console.log(`✅ Conversão concluída!`)
  console.log(`📄 Arquivo gerado: ${outputPath}`)
  console.log(`📊 Tamanho: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`)
  
  // 6. Estatísticas
  console.log('📊 ESTATÍSTICAS FINAIS:')
  console.log(`   Capítulos:     ${output.statistics.capitulos.toString().padStart(6)}`)
  console.log(`   Grupos:        ${output.statistics.grupos.toString().padStart(6)}`)
  console.log(`   Categorias:    ${output.statistics.categorias.toString().padStart(6)}`)
  console.log(`   Subcategorias: ${output.statistics.subcategorias.toString().padStart(6)}`)
  console.log(`   TOTAL:         ${(output.statistics.capitulos + output.statistics.grupos + output.statistics.categorias + output.statistics.subcategorias).toString().padStart(6)}\n`)
}

// Executar
main().catch(error => {
  console.error('❌ Erro durante a conversão:', error)
  process.exit(1)
})
