#!/usr/bin/env tsx
/**
 * Script para importar dados de CBO (Classificação Brasileira de Ocupações) do sistema legado SSF
 * 
 * Estrutura do CSV do SSF (cbo.csv):
 * id;codigo;descricao
 * 
 * Onde:
 * - id: ID sequencial
 * - codigo: Código CBO (6 dígitos)
 * - descricao: Nome da ocupação
 * 
 * A estrutura hierárquica do CBO é:
 * - Grande Grupo (1 dígito): código[0]
 * - Subgrupo Principal (2 dígitos): código[0:2]
 * - Subgrupo (3 dígitos): código[0:3]
 * - Família (4 dígitos): código[0:4]
 * - Ocupação (6 dígitos): código completo
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'

const SSF_CBO_PATH = path.resolve(__dirname, '../ssf/fixtures/cbo.csv')

interface CBOEntry {
  id: number
  codigo: string
  descricao: string
}

// Grandes Grupos do CBO
const GRANDES_GRUPOS: Record<string, string> = {
  '0': 'Forças Armadas, Policiais e Bombeiros Militares',
  '1': 'Membros Superiores do Poder Público, Dirigentes de Organizações de Interesse Público e de Empresas, Gerentes',
  '2': 'Profissionais das Ciências e das Artes',
  '3': 'Técnicos de Nível Médio',
  '4': 'Trabalhadores de Serviços Administrativos',
  '5': 'Trabalhadores dos Serviços, Vendedores do Comércio em Lojas e Mercados',
  '6': 'Trabalhadores Agropecuários, Florestais e da Pesca',
  '7': 'Trabalhadores da Produção de Bens e Serviços Industriais',
  '8': 'Trabalhadores da Produção de Bens e Serviços Industriais',
  '9': 'Trabalhadores de Reparação e Manutenção'
}

// Subgrupos Principais do CBO (2 dígitos)
const SUBGRUPOS_PRINCIPAIS: Record<string, string> = {
  '01': 'Militares da Aeronáutica',
  '02': 'Militares do Exército',
  '03': 'Militares da Marinha',
  '11': 'Membros Superiores e Dirigentes do Poder Público',
  '12': 'Dirigentes de Empresas e Organizações',
  '13': 'Diretores e Gerentes em Empresa de Serviços de Saúde, de Educação, ou de Serviços Culturais, Sociais ou Pessoais',
  '14': 'Gerentes',
  '20': 'Pesquisadores e Profissionais Policientíficos',
  '21': 'Profissionais das Ciências Exatas, Físicas e da Engenharia',
  '22': 'Profissionais das Ciências Biológicas, da Saúde e Afins',
  '23': 'Profissionais do Ensino',
  '24': 'Profissionais das Ciências Jurídicas',
  '25': 'Profissionais das Ciências Sociais e Humanas',
  '26': 'Comunicadores, Artistas e Religiosos',
  '27': 'Profissionais em Gastronomia',
  '30': 'Técnicos Mecatrônicos e Eletromecânicos',
  '31': 'Técnicos de Nível Médio das Ciências Físicas, Químicas, Engenharia e Afins',
  '32': 'Técnicos de Nível Médio das Ciências Biológicas, Bioquímicas, da Saúde e Afins',
  '33': 'Professores Leigos e de Nível Médio',
  '34': 'Técnicos de Nível Médio em Serviços de Transportes',
  '35': 'Técnicos de Nível Médio nas Ciências Administrativas',
  '37': 'Técnicos de Nível Médio dos Serviços Culturais, das Comunicações e dos Desportos',
  '39': 'Outros Técnicos de Nível Médio',
  '41': 'Escriturários',
  '42': 'Trabalhadores de Atendimento ao Público',
  '51': 'Trabalhadores dos Serviços',
  '52': 'Vendedores e Prestadores de Serviços do Comércio',
  '61': 'Trabalhadores na Exploração Agropecuária',
  '62': 'Trabalhadores na Exploração Florestal',
  '63': 'Pescadores e Caçadores',
  '64': 'Trabalhadores da Mecanização Agropecuária e Florestal',
  '71': 'Trabalhadores da Indústria Extrativa e da Construção Civil',
  '72': 'Trabalhadores da Transformação de Metais e de Compósitos',
  '73': 'Trabalhadores da Fabricação e Instalação Eletroeletrônica',
  '74': 'Montadores de Aparelhos e Instrumentos de Precisão e Musicais',
  '75': 'Joalheiros, Vidreiros, Ceramistas e Afins',
  '76': 'Trabalhadores nas Indústrias Têxtil, do Curtimento, do Vestido e das Artes Gráficas',
  '77': 'Trabalhadores das Indústrias de Madeira e do Mobiliário',
  '78': 'Trabalhadores de Funções Transversais',
  '81': 'Trabalhadores em Indústrias de Processos Contínuos e Outras Indústrias',
  '82': 'Trabalhadores de Instalações Siderúrgicas e de Materiais de Construção',
  '83': 'Trabalhadores de Instalações e Máquinas de Fabricação de Celulose e Papel',
  '84': 'Trabalhadores da Fabricação de Alimentos, Bebidas e Fumo',
  '86': 'Operadores de Produção, Captação, Tratamento e Distribuição (Energia, Água e Utilidades)',
  '87': 'Operadores de Outras Instalações Industriais',
  '91': 'Trabalhadores em Serviços de Reparação e Manutenção Mecânica',
  '95': 'Eletricistas Eletrônicos de Manutenção Veicular, Industrial e Comercial',
  '99': 'Outros Trabalhadores de Conservação, Manutenção e Reparação'
}

function parseCSV(content: string): CBOEntry[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  const entries: CBOEntry[] = []
  
  for (const line of lines) {
    const parts = line.split(';')
    if (parts.length < 3) continue
    
    const entry: CBOEntry = {
      id: parseInt(parts[0]) || 0,
      codigo: parts[1]?.trim() || '',
      descricao: parts[2]?.trim() || ''
    }
    
    // Remover aspas simples do final (alguns registros têm)
    entry.descricao = entry.descricao.replace(/['"]$/, '').trim()
    
    if (entry.codigo && entry.descricao) {
      entries.push(entry)
    }
  }
  
  return entries
}

function getLevel(code: string): number {
  // Determina o nível hierárquico baseado no padrão do código
  const len = code.length
  if (len <= 1) return 1  // Grande Grupo
  if (len <= 2) return 2  // Subgrupo Principal
  if (len <= 3) return 3  // Subgrupo
  if (len <= 4) return 4  // Família
  return 5                // Ocupação (6 dígitos)
}

function getParentCode(code: string): string | undefined {
  const len = code.length
  if (len <= 1) return undefined
  if (len === 2) return code[0]
  if (len === 3) return code.substring(0, 2)
  if (len === 4) return code.substring(0, 3)
  if (len >= 5) return code.substring(0, 4)
  return undefined
}

function extractFamilyCode(occupationCode: string): string {
  // Para ocupações de 6 dígitos, a família são os primeiros 4 dígitos
  return occupationCode.substring(0, 4)
}

async function main() {
  console.log('📥 Importando CBO do sistema SSF...')
  console.log(`📁 Arquivo: ${SSF_CBO_PATH}`)
  
  if (!fs.existsSync(SSF_CBO_PATH)) {
    throw new Error(`Arquivo não encontrado: ${SSF_CBO_PATH}`)
  }
  
  const content = fs.readFileSync(SSF_CBO_PATH, 'utf8')
  const entries = parseCSV(content)
  console.log(`📊 Total de registros encontrados: ${entries.length}`)
  
  // Primeiro, criar os Grandes Grupos
  console.log('🔧 Criando Grandes Grupos...')
  for (const [code, name] of Object.entries(GRANDES_GRUPOS)) {
    try {
      await OccupationCapabilityService.upsertGroup({
        code,
        name,
        level: 1
      })
    } catch (e: any) {
      console.error(`❌ Erro ao criar Grande Grupo ${code}: ${e.message}`)
    }
  }
  
  // Criar Subgrupos Principais
  console.log('🔧 Criando Subgrupos Principais...')
  for (const [code, name] of Object.entries(SUBGRUPOS_PRINCIPAIS)) {
    try {
      await OccupationCapabilityService.upsertGroup({
        code,
        name,
        level: 2,
        parentCode: code[0]
      })
    } catch (e: any) {
      console.error(`❌ Erro ao criar Subgrupo Principal ${code}: ${e.message}`)
    }
  }
  
  // Extrair e criar famílias únicas (4 dígitos)
  console.log('🔧 Extraindo e criando Famílias...')
  const families = new Map<string, string>()  // familyCode -> primeiro nome de ocupação (aproximado)
  
  for (const entry of entries) {
    const familyCode = extractFamilyCode(entry.codigo)
    if (!families.has(familyCode)) {
      // Usar o nome da primeira ocupação como base para a família
      // (na prática, as famílias têm nomes próprios, mas não estão no CSV)
      families.set(familyCode, `Família ${familyCode}`)
    }
  }
  
  let familiesCreated = 0
  for (const [familyCode, name] of families) {
    try {
      const parentCode = familyCode.substring(0, 3)
      // Verificar se existe o subgrupo pai (3 dígitos)
      const existingParent = await (prisma as any).cBOGroup.findFirst({
        where: { code: parentCode }
      })
      
      // Se não existe o subgrupo (3 dígitos), criar baseado no subgrupo principal
      if (!existingParent) {
        const subgrupoPrincipal = familyCode.substring(0, 2)
        await OccupationCapabilityService.upsertGroup({
          code: parentCode,
          name: `Subgrupo ${parentCode}`,
          level: 3,
          parentCode: subgrupoPrincipal
        })
      }
      
      await OccupationCapabilityService.upsertGroup({
        code: familyCode,
        name,
        level: 4,
        parentCode
      })
      familiesCreated++
    } catch (e: any) {
      // Ignorar erros de famílias já existentes
    }
    
    if (familiesCreated % 100 === 0 && familiesCreated > 0) {
      console.log(`  ... ${familiesCreated} famílias criadas`)
    }
  }
  
  console.log(`✅ ${familiesCreated} famílias criadas`)
  
  // Agora importar as ocupações
  console.log('📋 Importando ocupações...')
  let imported = 0
  let errors = 0
  
  for (const entry of entries) {
    try {
      const familyCode = extractFamilyCode(entry.codigo)
      
      await OccupationCapabilityService.upsertOccupation({
        code: entry.codigo,
        title: entry.descricao,
        groupCode: familyCode,
        description: `Código CBO: ${entry.codigo}`
      })
      
      imported++
    } catch (e: any) {
      console.error(`❌ Erro ao importar ${entry.codigo}: ${e.message}`)
      errors++
    }
    
    if (imported % 200 === 0) {
      console.log(`  ... ${imported} ocupações importadas`)
    }
  }
  
  console.log(`\n📊 Resumo:`)
  console.log(`   Grandes Grupos: ${Object.keys(GRANDES_GRUPOS).length}`)
  console.log(`   Subgrupos Principais: ${Object.keys(SUBGRUPOS_PRINCIPAIS).length}`)
  console.log(`   Famílias: ${familiesCreated}`)
  console.log(`   Ocupações: ${imported}`)
  console.log(`   Erros: ${errors}`)
  console.log(`   Taxa de sucesso: ${(imported / entries.length * 100).toFixed(1)}%`)
}

main()
  .catch(e => {
    console.error('❌ Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
