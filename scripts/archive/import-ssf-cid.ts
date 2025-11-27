#!/usr/bin/env tsx
/**
 * Script para importar dados de CID-10 do sistema legado SSF
 * 
 * Estrutura do CSV do SSF (cid.csv):
 * id;codigo;opcao;categoria;subcategoria;descricao;extendida;restricao
 * 
 * Onde:
 * - id: ID sequencial
 * - codigo: Código CID-10 (ex: A00, A00.0)
 * - opcao: Sistema Cruz/Asterisco (0, +, *)
 * - categoria: S=é categoria, N=não é
 * - subcategoria: S=é subcategoria, N=não é
 * - descricao: Descrição curta
 * - extendida: Descrição completa
 * - restricao: Restrição de sexo (1=homens, 3=mulheres, 5=ambos)
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { CodingService } from '@/lib/coding-service'

const SSF_CID_PATH = path.resolve(__dirname, '../ssf/fixtures/cid.csv')

interface CIDEntry {
  id: number
  codigo: string
  opcao: string        // '+', '*', '0'
  categoria: string    // 'S' ou 'N'
  subcategoria: string // 'S' ou 'N'
  descricao: string
  extendida: string
  restricao: string    // '1', '3', '5'
}

function parseCSV(content: string): CIDEntry[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  const entries: CIDEntry[] = []
  
  for (const line of lines) {
    const parts = line.split(';')
    if (parts.length < 7) continue
    
    const entry: CIDEntry = {
      id: parseInt(parts[0]) || 0,
      codigo: parts[1]?.trim() || '',
      opcao: parts[2]?.trim() || '0',
      categoria: parts[3]?.trim() || 'N',
      subcategoria: parts[4]?.trim() || 'N',
      descricao: parts[5]?.trim() || '',
      extendida: parts[6]?.trim() || '',
      restricao: parts[7]?.trim() || '5'
    }
    
    if (entry.codigo) {
      entries.push(entry)
    }
  }
  
  return entries
}

function getChapter(code: string): string {
  const letter = code.charAt(0)
  const num = parseInt(code.substring(1, 3)) || 0
  
  // CID-10 chapters
  if (letter === 'A' || letter === 'B') return 'I'     // Infecciosas e parasitárias
  if (letter === 'C' || (letter === 'D' && num <= 48)) return 'II'  // Neoplasias
  if (letter === 'D' && num >= 50) return 'III'        // Sangue
  if (letter === 'E') return 'IV'                      // Endócrinas
  if (letter === 'F') return 'V'                       // Mentais
  if (letter === 'G') return 'VI'                      // Sistema nervoso
  if (letter === 'H' && num <= 59) return 'VII'        // Olho
  if (letter === 'H' && num >= 60) return 'VIII'       // Ouvido
  if (letter === 'I') return 'IX'                      // Circulatório
  if (letter === 'J') return 'X'                       // Respiratório
  if (letter === 'K') return 'XI'                      // Digestivo
  if (letter === 'L') return 'XII'                     // Pele
  if (letter === 'M') return 'XIII'                    // Osteomuscular
  if (letter === 'N') return 'XIV'                     // Geniturinário
  if (letter === 'O') return 'XV'                      // Gravidez/parto
  if (letter === 'P') return 'XVI'                     // Perinatal
  if (letter === 'Q') return 'XVII'                    // Malformações
  if (letter === 'R') return 'XVIII'                   // Sintomas
  if (letter === 'S' || letter === 'T') return 'XIX'   // Lesões
  if (letter === 'V' || letter === 'W' || letter === 'X' || letter === 'Y') return 'XX'  // Externas
  if (letter === 'Z') return 'XXI'                     // Fatores
  if (letter === 'U') return 'XXII'                    // Códigos especiais
  
  return ''
}

function getSexRestriction(restricao: string): string | undefined {
  switch (restricao) {
    case '1': return 'M'  // Apenas masculino
    case '3': return 'F'  // Apenas feminino
    case '5': return undefined  // Ambos (sem restrição)
    default: return undefined
  }
}

function getCrossAsterisk(opcao: string): string | undefined {
  switch (opcao) {
    case '+': return 'ETIOLOGY'      // Código de etiologia
    case '*': return 'MANIFESTATION' // Código de manifestação
    default: return undefined
  }
}

async function main() {
  console.log('📥 Importando CID-10 do sistema SSF...')
  console.log(`📁 Arquivo: ${SSF_CID_PATH}`)
  
  if (!fs.existsSync(SSF_CID_PATH)) {
    throw new Error(`Arquivo não encontrado: ${SSF_CID_PATH}`)
  }
  
  const content = fs.readFileSync(SSF_CID_PATH, 'utf8')
  const entries = parseCSV(content)
  console.log(`📊 Total de registros encontrados: ${entries.length}`)
  
  // Criar ou atualizar o CodeSystem
  console.log('🔧 Configurando CodeSystem CID10...')
  await CodingService.upsertCodeSystem({
    kind: 'CID10' as any,
    name: 'CID-10 Brasil',
    version: '2025-SSF',
    description: 'Classificação Internacional de Doenças - 10ª Revisão (importado do SSF)',
    active: true
  })
  
  // Buscar o sistema criado
  const system = await (prisma as any).codeSystem.findFirst({
    where: { kind: 'CID10', version: '2025-SSF' }
  })
  
  if (!system) throw new Error('CodeSystem não encontrado após criação')
  
  // Construir mapa de hierarquia (categorias -> subcategorias)
  const categoryMap = new Map<string, string>()  // codigo -> id
  const parentMap = new Map<string, string>()    // subcategoria -> categoria
  
  // Primeiro pass: identificar categorias e construir hierarquia
  for (const entry of entries) {
    if (entry.categoria === 'S') {
      // É uma categoria principal (sem ponto)
      categoryMap.set(entry.codigo, entry.codigo)
    } else if (entry.subcategoria === 'S' && entry.codigo.includes('.')) {
      // É uma subcategoria
      const parentCode = entry.codigo.split('.')[0]
      parentMap.set(entry.codigo, parentCode)
    }
  }
  
  console.log(`📂 Categorias: ${categoryMap.size}, Subcategorias: ${parentMap.size}`)
  
  // Importar em batches
  const batchSize = 100
  let imported = 0
  let errors = 0
  
  // Primeiro, importar categorias (para ter os IDs de parent)
  console.log('📋 Importando categorias...')
  const idMap = new Map<string, string>()  // codigo -> database id
  
  for (const entry of entries) {
    if (entry.categoria !== 'S') continue
    
    try {
      const chapter = getChapter(entry.codigo)
      const sexRestriction = getSexRestriction(entry.restricao)
      const crossAsterisk = getCrossAsterisk(entry.opcao)
      
      // Combinar synonyms: descricao curta + extendida (se diferentes)
      const synonyms: string[] = []
      if (entry.descricao && entry.extendida && entry.descricao !== entry.extendida) {
        synonyms.push(entry.descricao)
      }
      
      const record = await (prisma as any).medicalCode.upsert({
        where: { systemId_code: { systemId: system.id, code: entry.codigo } },
        update: {
          display: entry.extendida || entry.descricao,
          description: entry.descricao !== entry.extendida ? entry.descricao : null,
          synonyms: synonyms.length ? JSON.stringify(synonyms) : null,
          chapter,
          isCategory: true,
          sexRestriction,
          crossAsterisk,
          shortDescription: entry.descricao !== entry.extendida ? entry.descricao : null,
          searchableText: [
            entry.codigo,
            entry.descricao,
            entry.extendida,
            chapter ? `capítulo ${chapter}` : '',
            sexRestriction === 'M' ? 'masculino homem' : '',
            sexRestriction === 'F' ? 'feminino mulher' : '',
            crossAsterisk === 'ETIOLOGY' ? 'etiologia' : '',
            crossAsterisk === 'MANIFESTATION' ? 'manifestação' : ''
          ].filter(Boolean).join(' ').toLowerCase()
        },
        create: {
          systemId: system.id,
          code: entry.codigo,
          display: entry.extendida || entry.descricao,
          description: entry.descricao !== entry.extendida ? entry.descricao : null,
          synonyms: synonyms.length ? JSON.stringify(synonyms) : null,
          chapter,
          isCategory: true,
          sexRestriction,
          crossAsterisk,
          shortDescription: entry.descricao !== entry.extendida ? entry.descricao : null,
          searchableText: [
            entry.codigo,
            entry.descricao,
            entry.extendida,
            chapter ? `capítulo ${chapter}` : ''
          ].filter(Boolean).join(' ').toLowerCase()
        }
      })
      
      idMap.set(entry.codigo, record.id)
      imported++
    } catch (e: any) {
      console.error(`❌ Erro ao importar ${entry.codigo}: ${e.message}`)
      errors++
    }
    
    if (imported % 500 === 0) {
      console.log(`  ... ${imported} categorias importadas`)
    }
  }
  
  console.log(`✅ ${imported} categorias importadas`)
  
  // Agora importar subcategorias com parentId
  console.log('📋 Importando subcategorias...')
  let subImported = 0
  
  for (const entry of entries) {
    if (entry.categoria === 'S') continue  // Já importado
    
    try {
      const chapter = getChapter(entry.codigo)
      const sexRestriction = getSexRestriction(entry.restricao)
      const crossAsterisk = getCrossAsterisk(entry.opcao)
      const parentCode = parentMap.get(entry.codigo)
      const parentId = parentCode ? idMap.get(parentCode) : undefined
      
      const synonyms: string[] = []
      if (entry.descricao && entry.extendida && entry.descricao !== entry.extendida) {
        synonyms.push(entry.descricao)
      }
      
      const record = await (prisma as any).medicalCode.upsert({
        where: { systemId_code: { systemId: system.id, code: entry.codigo } },
        update: {
          display: entry.extendida || entry.descricao,
          description: entry.descricao !== entry.extendida ? entry.descricao : null,
          parentId,
          synonyms: synonyms.length ? JSON.stringify(synonyms) : null,
          chapter,
          isCategory: false,
          sexRestriction,
          crossAsterisk,
          shortDescription: entry.descricao !== entry.extendida ? entry.descricao : null,
          searchableText: [
            entry.codigo,
            entry.descricao,
            entry.extendida,
            chapter ? `capítulo ${chapter}` : '',
            sexRestriction === 'M' ? 'masculino homem' : '',
            sexRestriction === 'F' ? 'feminino mulher' : '',
            crossAsterisk === 'ETIOLOGY' ? 'etiologia' : '',
            crossAsterisk === 'MANIFESTATION' ? 'manifestação' : ''
          ].filter(Boolean).join(' ').toLowerCase()
        },
        create: {
          systemId: system.id,
          code: entry.codigo,
          display: entry.extendida || entry.descricao,
          description: entry.descricao !== entry.extendida ? entry.descricao : null,
          parentId,
          synonyms: synonyms.length ? JSON.stringify(synonyms) : null,
          chapter,
          isCategory: false,
          sexRestriction,
          crossAsterisk,
          shortDescription: entry.descricao !== entry.extendida ? entry.descricao : null,
          searchableText: [
            entry.codigo,
            entry.descricao,
            entry.extendida,
            chapter ? `capítulo ${chapter}` : ''
          ].filter(Boolean).join(' ').toLowerCase()
        }
      })
      
      idMap.set(entry.codigo, record.id)
      subImported++
    } catch (e: any) {
      console.error(`❌ Erro ao importar ${entry.codigo}: ${e.message}`)
      errors++
    }
    
    if (subImported % 1000 === 0) {
      console.log(`  ... ${subImported} subcategorias importadas`)
    }
  }
  
  console.log(`✅ ${subImported} subcategorias importadas`)
  console.log(`\n📊 Resumo:`)
  console.log(`   Total processado: ${entries.length}`)
  console.log(`   Categorias: ${imported}`)
  console.log(`   Subcategorias: ${subImported}`)
  console.log(`   Erros: ${errors}`)
  console.log(`   Taxa de sucesso: ${((imported + subImported) / entries.length * 100).toFixed(1)}%`)
}

main()
  .catch(e => {
    console.error('❌ Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
