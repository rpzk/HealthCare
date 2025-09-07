import { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'

const prisma = new PrismaClient()

/*
  Limpa tabelas principais (truncate cascade) e roda sequência de seeds:
  1. prisma/seed.ts (básico)
  2. scripts/seed-historic-patients.ts
  3. scripts/seed-demo-data.ts
  4. scripts/complete-exams.ts
  5. scripts/seed-ai-data.ts
*/

const tables = [
  '"ai_analysis"','"ai_interactions"','"exam_results"','"exam_requests"','"vital_signs"','"prescriptions"','"consultations"','"medical_records"','"attachments"','"medical_documents"','"document_analysis"','"patients"','"users"','"audit_logs"'
]

async function truncateAll(){
  console.log('> Limpando tabelas...')
  for (const t of tables){
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE;`)
  }
}

function run(cmd:string){
  console.log('> Exec:', cmd)
  execSync(cmd, { stdio: 'inherit' })
}

async function main(){
  await truncateAll()
  await prisma.$disconnect()
  run('npm run db:seed')
  run('npm run db:seed:historic')
  run('npm run db:seed:demo')
  run('npm run db:exams:complete')
  run('npm run db:seed:ai')
  console.log('> Reset + seed completo finalizado.')
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())
