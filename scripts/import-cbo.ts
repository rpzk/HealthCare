#!/usr/bin/env ts-node
/**
 * Script de importação em lote de CBO (simplificado)
 * Espera um JSON com arrays: groups, occupations, roles
 * Exemplo: ts-node scripts/import-cbo.ts data/cbo-sample.json
 */
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { OccupationCapabilityService } from '@/lib/occupation-capability-service'

async function main(){
  const file = process.argv[2]
  if(!file){ console.error('Uso: ts-node scripts/import-cbo.ts <arquivo.json>'); process.exit(1) }
  const full = path.resolve(process.cwd(), file)
  if(!fs.existsSync(full)){ console.error('Arquivo não encontrado:', full); process.exit(1) }
  const json = JSON.parse(fs.readFileSync(full,'utf8'))
  const result = await OccupationCapabilityService.batchImport(json)
  console.log('Import concluído:', result)
}

main().finally(()=> prisma.$disconnect())
