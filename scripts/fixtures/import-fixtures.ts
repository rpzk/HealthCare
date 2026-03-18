#!/usr/bin/env tsx
/**
 * Script de Importação: Fixtures Master Data
 * 
 * Importa os dados convertidos (CBO, CID-10, SIGTAP) para o banco de dados.
 * 
 * Entrada:
 *   - fixtures/01-master-data/cbo/cbo-complete.json
 *   - fixtures/01-master-data/cid10/cid10-complete.json
 *   - fixtures/01-master-data/sigtap/sigtap-202602-complete.json
 * 
 * Saída:
 *   - Dados inseridos no PostgreSQL
 * 
 * Uso:
 *   npm run fixtures:import:all
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Configurar adapter para PostgreSQL (exigido no Prisma 7)
const connectionString = process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ============================================================
// PATHS
// ============================================================

const FIXTURES_BASE = path.join(process.cwd(), 'fixtures', '01-master-data')

// ============================================================
// INTERFACES
// ============================================================

interface CBOData {
  data: {
    grandeGrupos: any[]
    subgruposPrincipais: any[]
    subgrupos: any[]
    familias: any[]
    ocupacoes: any[]
    sinonimos: any[]
  }
}

interface CIDData {
  data: {
    capitulos: any[]
    grupos: any[]
    categorias: any[]
    subcategorias: any[]
  }
}

interface SIGTAPData {
  data: {
    grupos: any[]
    subgrupos: any[]
    formasOrganizacao: any[]
    procedimentos: any[]
    financiamentos: any[]
    rubricas: any[]
    modalidades: any[]
    compatibilidadesCBO: any[]
    compatibilidadesCID: any[]
  }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function loadJSON<T>(filePath: string): T {
  console.log(`   📄 Lendo ${path.basename(filePath)}...`)
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

async function batchInsert<T>(
  label: string,
  data: T[],
  insertFn: (item: T) => Promise<any>,
  batchSize: number = 1000
) {
  console.log(`   🔄 Importando ${label}: ${data.length} registros...`)
  
  let inserted = 0
  let errors = 0
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const results = await Promise.allSettled(batch.map(item => insertFn(item)))
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        inserted++
      } else {
        errors++
        if (errors <= 5) { // Mostrar apenas os primeiros 5 erros
          console.warn(`      ⚠️ Erro item ${i + idx}:`, result.reason.message?.substring(0, 100))
        }
      }
    })
    
    if (inserted % 5000 === 0 || inserted + errors === data.length) {
      console.log(`      ${inserted}/${data.length} (${((inserted / data.length) * 100).toFixed(1)}%) - ${errors} erros`)
    }
  }
  
  console.log(`   ✓ ${label}: ${inserted} registros importados (${errors} erros)`)
  return { inserted, errors }
}

// ============================================================
// IMPORTADORES
// ============================================================

async function importCBO() {
  console.log('\n📦 IMPORTANDO CBO...\n')
  
  const cboData = loadJSON<CBOData>(path.join(FIXTURES_BASE, 'cbo/cbo-complete.json'))
  
  // 1. Grande Grupos
  await batchInsert('Grande Grupos', cboData.data.grandeGrupos, async (item) => {
    await prisma.cBOGrandeGrupo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description
      },
      update: {
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 2. Subgrupos Principais
  await batchInsert('Subgrupos Principais', cboData.data.subgruposPrincipais, async (item) => {
    const grandeGrupo = await prisma.cBOGrandeGrupo.findUnique({ where: { code: item.grandeGrupoCode } })
    if (!grandeGrupo) {
      console.warn(`⚠️ Grande Grupo não encontrado: ${item.grandeGrupoCode}`)
      return
    }
    
    await prisma.cBOSubgrupoPrincipal.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        grandeGrupoId: grandeGrupo.id
      },
      update: {
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 3. Subgrupos
  await batchInsert('Subgrupos', cboData.data.subgrupos, async (item) => {
    const subgrupoPrincipal = await prisma.cBOSubgrupoPrincipal.findUnique({ where: { code: item.subgrupoPrincipalCode } })
    if (!subgrupoPrincipal) return
    
    await prisma.cBOSubgrupo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        subgrupoPrincipalId: subgrupoPrincipal.id
      },
      update: {
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 4. Famílias
  await batchInsert('Famílias', cboData.data.familias, async (item) => {
    const subgrupo = await prisma.cBOSubgrupo.findUnique({ where: { code: item.subgrupoCode } })
    if (!subgrupo) return
    
    await prisma.cBOFamilia.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        subgrupoId: subgrupo.id
      },
      update: {
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 5. Ocupações
  await batchInsert('Ocupações', cboData.data.ocupacoes, async (item) => {
    const familia = await prisma.cBOFamilia.findUnique({ where: { code: item.familiaCode } })
    
    await prisma.occupation.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        title: item.title,
        description: item.description,
        familiaId: familia?.id,
        grandeGrupoCode: item.grandeGrupoCode,
        familiaCode: item.familiaCode
      },
      update: {
        title: item.title,
        description: item.description,
        familiaId: familia?.id,
        grandeGrupoCode: item.grandeGrupoCode,
        familiaCode: item.familiaCode
      }
    })
  })
  
  console.log('\n✅ CBO importado com sucesso!')
}

async function importCID() {
  console.log('\n📦 IMPORTANDO CID-10...\n')
  
  const cidData = loadJSON<CIDData>(path.join(FIXTURES_BASE, 'cid10/cid10-complete.json'))
  
  // 1. Capítulos
  await batchInsert('Capítulos', cidData.data.capitulos, async (item) => {
    const codeRange = item.initial && item.final ? `${item.initial}-${item.final}` : item.codeRange || item.code
    await prisma.cID10Capitulo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        codeRange,
        name: item.name,
        description: item.description
      },
      update: {
        codeRange,
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 2. Grupos
  await batchInsert('Grupos', cidData.data.grupos, async (item) => {
    const capitulo = await prisma.cID10Capitulo.findUnique({ where: { code: item.capituloCode } })
    if (!capitulo) return
    
    await prisma.cID10Grupo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        capituloId: capitulo.id
      },
      update: {
        name: item.name,
        description: item.description
      }
    })
  })
  
  // 3. Categorias
  await batchInsert('Categorias', cidData.data.categorias, async (item) => {
    const grupo = item.grupoCode ? await prisma.cID10Grupo.findUnique({ where: { code: item.grupoCode } }) : null
    if (!grupo) return

    await prisma.cID10Categoria.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        grupoId: grupo.id
      },
      update: {
        name: item.name,
        description: item.description,
        grupoId: grupo.id
      }
    })
  })
  
  // 4. Subcategorias (MedicalCode)
  const codeSystem = await prisma.codeSystem.findFirst({ where: { kind: 'CID10' } })
  if (!codeSystem) throw new Error('CodeSystem CID10 não encontrado. Execute importCBO/outros antes.')

  await batchInsert('Subcategorias', cidData.data.subcategorias, async (item) => {
    const categoriaCode = item.code.split('.')[0]
    const categoria = await prisma.cID10Categoria.findUnique({
      where: { code: categoriaCode },
      include: { grupo: { include: { capitulo: true } } }
    })
    const grupo = categoria?.grupo
    const capitulo = grupo?.capitulo

    await prisma.medicalCode.upsert({
      where: { systemId_code: { systemId: codeSystem.id, code: item.code } },
      create: {
        systemId: codeSystem.id,
        code: item.code,
        display: item.name,
        categoriaId: categoria?.id,
        capituloId: capitulo?.id,
        grupoId: grupo?.id,
        capituloCode: capitulo?.code,
        grupoCode: grupo?.code
      },
      update: {
        display: item.name,
        categoriaId: categoria?.id,
        capituloId: capitulo?.id,
        grupoId: grupo?.id,
        capituloCode: capitulo?.code,
        grupoCode: grupo?.code
      }
    })
  })
  
  console.log('\n✅ CID-10 importado com sucesso!')
}

async function importSIGTAP() {
  console.log('\n📦 IMPORTANDO SIGTAP...\n')
  
  const sigtapData = loadJSON<SIGTAPData>(path.join(FIXTURES_BASE, 'sigtap/sigtap-202602-complete.json'))
  
  // 1. Grupos
  await batchInsert('Grupos', sigtapData.data.grupos, async (item) => {
    await prisma.sIGTAPGrupo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 2. Subgrupos
  await batchInsert('Subgrupos', sigtapData.data.subgrupos, async (item) => {
    const grupo = await prisma.sIGTAPGrupo.findUnique({ where: { code: item.grupoCode } })
    if (!grupo) return
    
    await prisma.sIGTAPSubgrupo.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        grupoId: grupo.id
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 3. Formas de Organização
  await batchInsert('Formas Organização', sigtapData.data.formasOrganizacao, async (item) => {
    const subgrupo = await prisma.sIGTAPSubgrupo.findUnique({ where: { code: item.subgrupoCode } })
    if (!subgrupo) return
    
    await prisma.sIGTAPFormaOrganizacao.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        subgrupoId: subgrupo.id
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 4. Financiamentos
  await batchInsert('Financiamentos', sigtapData.data.financiamentos, async (item) => {
    await prisma.sIGTAPFinanciamento.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 5. Rubricas
  await batchInsert('Rubricas', sigtapData.data.rubricas, async (item) => {
    await prisma.sIGTAPRubrica.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 6. Modalidades
  await batchInsert('Modalidades', sigtapData.data.modalidades, async (item) => {
    await prisma.sIGTAPModalidade.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name
      },
      update: {
        name: item.name
      }
    })
  })
  
  // 7. Procedimentos
  console.log('\n   🔄 Importando Procedimentos (pode demorar)...')
  await batchInsert('Procedimentos', sigtapData.data.procedimentos, async (item) => {
    // Buscar relações
    const codigoGrupo = item.code.substring(0, 2)
    const codigoSubgrupo = item.code.substring(0, 4)
    const codigoForma = item.code.substring(0, 6)
    
    const grupo = await prisma.sIGTAPGrupo.findUnique({ where: { code: codigoGrupo } })
    const subgrupo = await prisma.sIGTAPSubgrupo.findUnique({ where: { code: codigoSubgrupo } })
    const forma = await prisma.sIGTAPFormaOrganizacao.findUnique({ where: { code: codigoForma } })
    const financiamento = item.financiamentoCode ? await prisma.sIGTAPFinanciamento.findUnique({ where: { code: item.financiamentoCode } }) : null
    const rubrica = item.rubricaCode ? await prisma.sIGTAPRubrica.findUnique({ where: { code: item.rubricaCode } }) : null
    
    await prisma.sIGTAPProcedimento.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        grupoId: grupo?.id,
        subgrupoId: subgrupo?.id,
        formaOrganizacaoId: forma?.id,
        financiamentoId: financiamento?.id,
        rubricaId: rubrica?.id,
        valorSH: item.valorSH,
        valorSA: item.valorSA,
        valorSP: item.valorSP,
        complexity: item.complexity,
        minAge: item.idadeMinima,
        maxAge: item.idadeMaxima,
        sexRestriction: item.sexRestriction,
        qtMaximaExecucao: item.qtMaximaExecucao,
        qtDiasPermanencia: item.qtDiasPermanencia,
        competencia: item.competencia
      },
      update: {
        name: item.name,
        valorSH: item.valorSH,
        valorSA: item.valorSA,
        valorSP: item.valorSP
      }
    })
  }, 100) // Batch menor para procedimentos (muitas relações)
  
  // 8. Compatibilidades CBO
  console.log('\n   🔄 Importando Compatibilidades CBO (pode demorar)...')
  await batchInsert('Compatibilidades CBO', sigtapData.data.compatibilidadesCBO, async (item) => {
    const procedimento = await prisma.sIGTAPProcedimento.findUnique({ where: { code: item.procedureCode } })
    if (!procedimento) return
    
    await prisma.procedureCBOCompatibility.upsert({
      where: {
        procedureId_occupationCode: {
          procedureId: procedimento.id,
          occupationCode: item.cboCode
        }
      },
      create: {
        procedureId: procedimento.id,
        occupationCode: item.cboCode,
        type: 'PERMITIDA',
        competencia: item.competencia
      },
      update: {}
    })
  }, 500)
  
  // 9. Compatibilidades CID
  console.log('\n   🔄 Importando Compatibilidades CID (pode demorar)...')
  await batchInsert('Compatibilidades CID', sigtapData.data.compatibilidadesCID, async (item) => {
    const procedimento = await prisma.sIGTAPProcedimento.findUnique({ where: { code: item.procedureCode } })
    if (!procedimento) return
    
    await prisma.procedureCIDCompatibility.upsert({
      where: {
        procedureId_cidCode: {
          procedureId: procedimento.id,
          cidCode: item.cidCode
        }
      },
      create: {
        procedureId: procedimento.id,
        cidCode: item.cidCode,
        type: 'PERMITIDA',
        competencia: item.competencia
      },
      update: {}
    })
  }, 500)
  
  console.log('\n✅ SIGTAP importado com sucesso!')
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 INICIANDO IMPORTAÇÃO DE FIXTURES MASTER DATA\n')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  
  try {
    // Limpar dados antigos
    console.log('\n🧹 Limpando dados antigos...')
    
    // Limpar CID
    await prisma.medicalCode.deleteMany({})
    await prisma.cID10Categoria.deleteMany({})
    await prisma.cID10Grupo.deleteMany({})
    await prisma.cID10Capitulo.deleteMany({})
    console.log('   ✓ CID-10 limpo')

    // Importar na ordem correta (hierarquias antes de dependentes)
    // SIGTAP é gerenciado pelo script dedicado: npm run sigtap:update
    await importCBO()
    await importCID()
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2)
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log(`⏱️  Tempo total: ${duration} minutos`)
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error('\n❌ Erro durante a importação:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

// Executar
main().catch(error => {
  console.error('Falha fatal:', error)
  process.exit(1)
})
