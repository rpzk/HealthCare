#!/usr/bin/env tsx
import 'dotenv/config'

/**
 * Seed da Equipe de Teste - Vincula enfermeiro, técnico e recepcionista aos pacientes históricos
 *
 * Cria equipe multi-profissional para validar funcionalidades de:
 * - Equipe de atendimento
 * - Diferentes níveis de acesso
 * - Fluxos por role
 *
 * Uso: npm run db:seed:team
 *
 * Pré-requisitos:
 * - db:seed (usuários base)
 * - db:seed:historical (pacientes históricos + médico)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { addToCareTeam } from '@/lib/patient-access'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

async function main() {
  console.log('👥 Seed da Equipe de Teste - Iniciando...\n')

  const [doctor, nurse, technician, receptionist] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'doctor@healthcare.com', role: 'DOCTOR' } }),
    prisma.user.findFirst({ where: { email: 'nurse@healthcare.com', role: 'NURSE' } }),
    prisma.user.findFirst({ where: { email: 'technician@healthcare.com', role: 'TECHNICIAN' } }),
    prisma.user.findFirst({ where: { email: 'receptionist@healthcare.com', role: 'RECEPTIONIST' } }),
  ])

  if (!doctor) {
    throw new Error('Médico doctor@healthcare.com não encontrado. Execute: npm run db:seed')
  }
  if (!nurse) {
    throw new Error('Enfermeiro nurse@healthcare.com não encontrado. Execute: npm run db:seed')
  }
  if (!technician) {
    throw new Error('Técnico technician@healthcare.com não encontrado. Execute: npm run db:seed')
  }
  if (!receptionist) {
    throw new Error('Recepcionista receptionist@healthcare.com não encontrado. Execute: npm run db:seed')
  }

  const patients = await prisma.patient.findMany({
    where: {
      careTeam: {
        some: { userId: doctor.id, isPrimary: true },
      },
    },
    select: { id: true, name: true },
  })

  if (patients.length === 0) {
    console.log('⚠️  Nenhum paciente do médico de teste encontrado. Execute: npm run db:seed:historical')
    return
  }

  let added = 0
  for (const patient of patients) {
    for (const [user, level, label] of [
      [nurse, 'CONSULTATION' as const, 'Enfermeiro'],
      [technician, 'LIMITED' as const, 'Técnico'],
      [receptionist, 'VIEW_ONLY' as const, 'Recepcionista'],
    ]) {
      await addToCareTeam(patient.id, (user as typeof nurse).id, doctor.id, {
        accessLevel: level as import('@/lib/patient-access').CareTeamAccessLevel,
        isPrimary: false,
        reason: `Equipe de teste - ${label}`,
      })
      added++
    }
  }

  console.log(`✅ ${patients.length} pacientes com equipe multi-profissional`)
  console.log(`   Enfermeiro (CONSULTATION): nurse@healthcare.com / nurse123`)
  console.log(`   Técnico (LIMITED): technician@healthcare.com / tech123`)
  console.log(`   Recepcionista (VIEW_ONLY): receptionist@healthcare.com / recep123`)
  console.log('\n✨ Seed da equipe concluído.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
