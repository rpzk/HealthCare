#!/usr/bin/env tsx
/**
 * Limpa todas as consultas e prescrições do banco (dados de teste).
 * Mantém: usuários, pacientes, certificados, configurações.
 *
 * Uso: npx tsx scripts/clear-consultations-and-prescriptions.ts [--confirm]
 */

import 'dotenv/config'
import { PrismaClient, SignedDocumentType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL não configurado. Defina no .env ou ambiente.')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
})
const skipConfirm = process.argv.includes('--confirm')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'

async function promptConfirm(message: string): Promise<boolean> {
  if (skipConfirm) return true
  return new Promise((resolve) => {
    process.stdout.write(`${YELLOW}${message}${RESET} (s/n): `)
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase() === 's')
    })
  })
}

async function main() {
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`)
  console.log(`${BLUE}Limpar consultas e prescrições (dados de teste)${RESET}`)
  console.log(`${BLUE}${'='.repeat(60)}${RESET}`)

  const confirmed = await promptConfirm(
    `${RED}Remover TODAS as consultas e prescrições? Pacientes e usuários serão mantidos.${RESET}`
  )
  if (!confirmed) {
    console.log(`${YELLOW}Cancelado.${RESET}`)
    process.exit(0)
  }

  await prisma.$transaction(async (tx) => {
    // 1) Registros de assinatura de prescrições
    const deletedSigned = await tx.signedDocument.deleteMany({
      where: { documentType: SignedDocumentType.PRESCRIPTION },
    })
    console.log(`${GREEN}  SignedDocument (prescrição): ${deletedSigned.count}${RESET}`)

    // 2) Prescrições (PrescriptionItem tem onDelete Cascade)
    const deletedPrescriptions = await tx.prescription.deleteMany({})
    console.log(`${GREEN}  Prescrições: ${deletedPrescriptions.count}${RESET}`)

    // 3) Desvincular fila de espera das consultas
    const waiting = await tx.waitingList.updateMany({
      data: { appointmentId: null },
      where: { appointmentId: { not: null } },
    })
    console.log(`${GREEN}  WaitingList desvinculada: ${waiting.count}${RESET}`)

    // 4) NPS vinculado à consulta (consultationId obrigatório)
    const deletedNps = await tx.npsResponse.deleteMany({})
    console.log(`${GREEN}  NpsResponse: ${deletedNps.count}${RESET}`)

    // 5) Diagnósticos vinculados a consultas
    const deletedDiagnoses = await tx.diagnosis.deleteMany({
      where: { consultationId: { not: null } },
    })
    console.log(`${GREEN}  Diagnosis (com consulta): ${deletedDiagnoses.count}${RESET}`)

    // 6) Desvincular encaminhamentos, exames, sinais vitais, atestados
    await tx.referral.updateMany({
      data: { consultationId: null },
      where: { consultationId: { not: null } },
    })
    await tx.examRequest.updateMany({
      data: { consultationId: null },
      where: { consultationId: { not: null } },
    })
    await tx.vitalSigns.updateMany({
      data: { consultationId: null },
      where: { consultationId: { not: null } },
    })
    await tx.medicalCertificate.updateMany({
      data: { consultationId: null },
      where: { consultationId: { not: null } },
    })
    console.log(`${GREEN}  Referrals/ExamRequests/VitalSigns/MedicalCertificates desvinculados${RESET}`)

    // 7) PatientQuestionnaire desvincular da consulta
    const pq = await tx.patientQuestionnaire.updateMany({
      data: { consultationId: null },
      where: { consultationId: { not: null } },
    })
    console.log(`${GREEN}  PatientQuestionnaire desvinculado: ${pq.count}${RESET}`)

    // 8) Consultas (TelemedicineRecording tem onDelete Cascade)
    const deletedConsultations = await tx.consultation.deleteMany({})
    console.log(`${GREEN}  Consultas: ${deletedConsultations.count}${RESET}`)
  })

  console.log(`\n${GREEN}✅ Limpeza concluída. Você pode atender e criar novas prescrições.${RESET}\n`)
}

main()
  .catch((e) => {
    console.error(`${RED}Erro:${RESET}`, e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
