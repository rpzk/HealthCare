import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import prisma from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id, email, crm } = body || {}

    let user = null
    if (id) {
      user = await prisma.user.findUnique({ where: { id } })
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } })
    } else if (crm) {
      user = await prisma.user.findFirst({ where: { crmNumber: crm } })
    }
    if (!user) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

    const doctorId = user.id

    const [
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referralsOrigin,
      referralsDestination,
      medicalRecords,
      questionnairesSent,
      npsResponses,
    ] = await Promise.all([
      prisma.consultation.findMany({ where: { doctorId } }),
      prisma.prescription.findMany({ where: { doctorId } }),
      prisma.examRequest.findMany({ where: { doctorId } }),
      prisma.medicalCertificate.findMany({ where: { doctorId } }),
      prisma.referral.findMany({ where: { doctorId } }),
      prisma.referral.findMany({ where: { destinationDoctorId: doctorId } }),
      prisma.medicalRecord.findMany({ where: { doctorId } }),
      prisma.patientQuestionnaire.findMany({ where: { sentById: doctorId } }),
      prisma.npsResponse.findMany({ where: { doctorId } }),
    ])

    const exportData = {
      meta: { generatedAt: new Date().toISOString(), kind: 'professional', doctorId },
      professional: user,
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referralsOrigin,
      referralsDestination,
      medicalRecords,
      questionnairesSent,
      npsResponses,
    }

    const base = process.env.BACKUPS_DIR || '/app/backups'
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14)
    const file = path.join(base, `professional_${ts}_${doctorId}.json`)
    await fs.mkdir(base, { recursive: true })
    await fs.writeFile(file, JSON.stringify(exportData, null, 2), 'utf8')

    return NextResponse.json({ success: true, filename: path.basename(file) })
  } catch (e: any) {
    console.error('[Entity Professional Backup] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao exportar profissional' }, { status: 500 })
  }
}
