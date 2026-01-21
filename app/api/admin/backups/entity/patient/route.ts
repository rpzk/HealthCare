import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id, cpf, email } = body || {}

    let patient = null
    if (id) {
      patient = await prisma.patient.findUnique({ where: { id } })
    } else if (cpf) {
      patient = await prisma.patient.findFirst({ where: { cpf } })
    } else if (email) {
      patient = await prisma.patient.findUnique({ where: { email } })
    }
    if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const patientId = patient.id

    const [
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referrals,
      medicalRecords,
      questionnaires,
      npsResponses,
    ] = await Promise.all([
      prisma.consultation.findMany({ where: { patientId } }),
      prisma.prescription.findMany({ where: { patientId } }),
      prisma.examRequest.findMany({ where: { patientId } }),
      prisma.medicalCertificate.findMany({ where: { patientId } }),
      prisma.referral.findMany({ where: { patientId } }),
      prisma.medicalRecord.findMany({ where: { patientId } }),
      prisma.patientQuestionnaire.findMany({ where: { patientId } }),
      prisma.npsResponse.findMany({ where: { patientId } }),
    ])

    const exportData = {
      meta: { generatedAt: new Date().toISOString(), kind: 'patient', patientId },
      patient,
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referrals,
      medicalRecords,
      questionnaires,
      npsResponses,
    }

    const base = process.env.BACKUPS_DIR || '/app/backups'
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14)
    const file = path.join(base, `patient_${ts}_${patientId}.json`)
    await fs.mkdir(base, { recursive: true })
    await fs.writeFile(file, JSON.stringify(exportData, null, 2), 'utf8')

    return NextResponse.json({ success: true, filename: path.basename(file) })
  } catch (e: any) {
    logger.error('[Entity Patient Backup] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao exportar paciente' }, { status: 500 })
  }
}
