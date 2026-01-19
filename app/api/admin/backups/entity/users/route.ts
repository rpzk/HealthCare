import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

/**
 * POST /api/admin/backups/entity/users
 * Exporta dados completos de um usuário (profissional/admin/etc) por ID, email ou licenseNumber
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id, email, licenseNumber } = body

    if (!id && !email && !licenseNumber) {
      return NextResponse.json({ error: 'Informe id, email ou licenseNumber' }, { status: 400 })
    }

    const where: any = {}
    if (id) where.id = id
    else if (email) where.email = email
    else if (licenseNumber) where.licenseNumber = licenseNumber

    const user = await prisma.user.findFirst({
      where,
      include: {
        person: true,
        webauthnCredentials: true,
        jobRoles: true,
        termAcceptances: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar dados relacionados em paralelo
    const [
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referralsOrigin,
      referralsDest,
      medicalRecords,
      questionnairesSent,
      npsResponses,
      protocols,
    ] = await Promise.all([
      prisma.consultation.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.prescription.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.examRequest.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.medicalCertificate.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.referral.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.referral.findMany({ where: { destinationDoctorId: user.id }, include: { patient: true } }),
      prisma.medicalRecord.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.patientQuestionnaire.findMany({ where: { sentById: user.id }, include: { patient: true } }),
      prisma.npsResponse.findMany({ where: { doctorId: user.id }, include: { patient: true } }),
      prisma.protocol.findMany({ where: { doctorId: user.id } }),
    ])

    const exportData = {
      user,
      consultations,
      prescriptions,
      examRequests,
      medicalCertificates,
      referralsOrigin,
      referralsDest,
      medicalRecords,
      questionnairesSent,
      npsResponses,
      protocols,
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.id,
    }

    const base = process.env.BACKUPS_DIR || '/app/backups'
    await fs.mkdir(base, { recursive: true })
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const filename = `user_${ts}_${user.id}.json`
    await fs.writeFile(path.join(base, filename), JSON.stringify(exportData, null, 2), 'utf8')

    return NextResponse.json({
      success: true,
      filename,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      stats: {
        consultations: consultations.length,
        prescriptions: prescriptions.length,
        examRequests: examRequests.length,
        medicalCertificates: medicalCertificates.length,
        referrals: referralsOrigin.length + referralsDest.length,
        medicalRecords: medicalRecords.length,
        questionnairesSent: questionnairesSent.length,
        npsResponses: npsResponses.length,
        protocols: protocols.length,
      },
    })
  } catch (e: any) {
    console.error('[User Backup] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao exportar usuário' }, { status: 500 })
  }
}
