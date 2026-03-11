#!/usr/bin/env tsx
/**
 * Script de Importação: CID-10 via SQL Direto
 * 
 * Contorna o bug do Prisma 7 que trunca strings nas queries upsert.
 * Usa SQL raw para garantir que os dados sejam inseridos corretamente.
 * 
 * Uso:
 *   npm run fixtures:import:cid-sql
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const connectionString = process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const FIXTURES_BASE = path.join(process.cwd(), 'fixtures', '01-master-data')

interface CIDData {
  data: {
    capitulos: any[]
    grupos: any[]
    categorias: any[]
    subcategorias: any[]
  }
}

async function main() {
  console.log('🚀 IMPORTANDO CID-10 VIA SQL DIRETO\n')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  
  try {
    // Carregar dados
    console.log('\n📂 Carregando cid10-complete.json...')
    const cidData: CIDData = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_BASE, 'cid10/cid10-complete.json'), 'utf-8')
    )
    console.log(`   ✓ ${cidData.data.capitulos.length} capítulos`)
    console.log(`   ✓ ${cidData.data.grupos.length} grupos`)
    console.log(`   ✓ ${cidData.data.categorias.length} categorias`)
    console.log(`   ✓ ${cidData.data.subcategorias.length} subcategorias\n`)
    
    // Limpar dados antigos
    console.log('🧹 Limpando dados CID-10 antigos...')
    await prisma.$executeRaw`DELETE FROM medical_codes WHERE "systemId" IN (SELECT id FROM code_systems WHERE kind = 'CID10')`
    await prisma.$executeRaw`DELETE FROM cid10_categorias`
    await prisma.$executeRaw`DELETE FROM cid10_grupos`
    await prisma.$executeRaw`DELETE FROM cid10_capitulos`
    console.log('   ✓ Limpeza concluída\n')
    
    // Criar ou obter CodeSystem CID10
    console.log('📋 Configurando CodeSystem CID-10...')
    const codeSystem = await prisma.$queryRaw<any[]>`
      SELECT id FROM code_systems WHERE kind = 'CID10' LIMIT 1
    `
    
    let cid10SystemId: string
    if (codeSystem.length === 0) {
      const result = await prisma.$queryRaw<any[]>`
        INSERT INTO code_systems (id, kind, name, version, description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'CID10', 'CID-10', '2019', 'Classificação Internacional de Doenças - 10ª Revisão', NOW(), NOW())
        RETURNING id
      `
      cid10SystemId = result[0].id
      console.log(`   ✓ CodeSystem CID-10 criado: ${cid10SystemId}\n`)
    } else {
      cid10SystemId = codeSystem[0].id
      console.log(`   ✓ CodeSystem CID-10 encontrado: ${cid10SystemId}\n`)
    }
    
    // 1. CAPÍTULOS
    console.log('📊 Importando Capítulos...')
    let inserted = 0
    for (const cap of cidData.data.capitulos) {
      await prisma.$executeRaw`
        INSERT INTO cid10_capitulos (id, code, "codeRange", name, description, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${cap.code},
          ${cap.initial + '-' + cap.final},
          ${cap.name},
          ${cap.description},
          NOW(),
          NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          "codeRange" = EXCLUDED."codeRange",
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          "updatedAt" = NOW()
      `
      inserted++
    }
    console.log(`   ✓ ${inserted} capítulos importados\n`)
    
    // 2. GRUPOS
    console.log('📊 Importando Grupos...')
    inserted = 0
    for (const grupo of cidData.data.grupos) {
      // Buscar capitulo
      const capitulo = await prisma.$queryRaw<any[]>`
        SELECT id FROM cid10_capitulos WHERE code = ${grupo.capituloCode} LIMIT 1
      `
      const capituloId = capitulo[0]?.id
      
      if (capituloId) {
        await prisma.$executeRaw`
          INSERT INTO cid10_grupos (id, code, name, description, "capituloId", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(),
            ${grupo.code},
            ${grupo.name},
            ${grupo.description},
            ${capituloId},
            NOW(),
            NOW()
          )
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            "updatedAt" = NOW()
        `
        inserted++
      }
      
      if (inserted % 100 === 0) {
        console.log(`   Progresso: ${inserted}/${cidData.data.grupos.length}`)
      }
    }
    console.log(`   ✓ ${inserted} grupos importados\n`)
    
    // 3. CATEGORIAS
    console.log('📊 Importando Categorias...')
    inserted = 0
    for (const cat of cidData.data.categorias) {
      // Buscar grupo pelo código
      const grupo = cat.grupoCode ? await prisma.$queryRaw<any[]>`
        SELECT id FROM cid10_grupos WHERE code = ${cat.grupoCode} LIMIT 1
      ` : null
      const grupoId = grupo?.[0]?.id || null
      
      if (grupoId) {
        await prisma.$executeRaw`
          INSERT INTO cid10_categorias (
            id, code, name, description, "grupoId", "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid(),
            ${cat.code},
            ${cat.name},
            ${cat.description},
            ${grupoId},
            NOW(),
            NOW()
          )
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            "grupoId" = EXCLUDED."grupoId",
            "updatedAt" = NOW()
        `
        inserted++
      }
      
      if (inserted % 500 === 0) {
        console.log(`   Progresso: ${inserted}/${cidData.data.categorias.length}`)
      }
    }
    console.log(`   ✓ ${inserted} categorias importadas\n`)
    
    // 4. SUBCATEGORIAS (medical_codes)
    console.log('📊 Importando Subcategorias (pode demorar)...')
    inserted = 0
    for (const sub of cidData.data.subcategorias) {
      const categoriaCode = sub.code.split('.')[0]
      
      // Buscar categoria
      const categoria = await prisma.$queryRaw<any[]>`
        SELECT id, "grupoId" 
        FROM cid10_categorias 
        WHERE code = ${categoriaCode} 
        LIMIT 1
      `
      const cat = categoria[0] || null
      
      // Verificar se já existe
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM medical_codes WHERE code = ${sub.code} AND "systemId" = ${cid10SystemId} LIMIT 1
      `
      
      if (existing.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO medical_codes (
            id, "systemId", code, display, "categoriaId", "grupoId", "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid(),
            ${cid10SystemId},
            ${sub.code},
            ${sub.name},
            ${cat?.id},
            ${cat?.grupoId},
            NOW(),
            NOW()
          )
        `
        inserted++
      } else {
        await prisma.$executeRaw`
          UPDATE medical_codes SET
            display = ${sub.name},
            "categoriaId" = ${cat?.id},
            "grupoId" = ${cat?.grupoId},
            "updatedAt" = NOW()
          WHERE code = ${sub.code} AND "systemId" = ${cid10SystemId}
        `
        inserted++
      }
      
      if (inserted % 1000 === 0) {
        console.log(`   Progresso: ${inserted}/${cidData.data.subcategorias.length}`)
      }
    }
    console.log(`   ✓ ${inserted} subcategorias importadas\n`)
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2)
    
    console.log('=' .repeat(60))
    console.log('✅ CID-10 IMPORTADO COM SUCESSO VIA SQL!')
    console.log(`⏱️  Tempo total: ${duration} minutos`)
    console.log('=' .repeat(60) + '\n')
    
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
