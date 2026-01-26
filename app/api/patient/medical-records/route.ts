import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const lookup = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { patientId: true, email: true },
    })

    const patient = lookup?.patientId
      ? await prisma.patient.findUnique({ where: { id: lookup.patientId } })
      : lookup?.email
        ? await prisma.patient.findFirst({ where: { email: { equals: lookup.email, mode: 'insensitive' } } })
        : null

    if (!patient) {
      return NextResponse.json([])
    }

    // Buscar consultas como histórico
    const consultations = await prisma.consultation.findMany({
      where: { patientId: patient.id, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
      include: { doctor: { select: { name: true, speciality: true } } },
      orderBy: { scheduledDate: 'desc' },
      take: 50
    })

    // Buscar prescrições
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      include: { doctor: { select: { name: true, speciality: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Buscar exames
    const exams = await prisma.examRequest.findMany({
      where: { patientId: patient.id, status: 'COMPLETED' },
      include: { doctor: { select: { name: true } } },
      orderBy: { completedDate: 'desc' },
      take: 50
    })

    // Combinar todos os registros
    const records = [
      ...consultations.map(c => ({
        id: c.id,
        type: 'CONSULTATION' as const,
        title: c.type || 'Consulta Médica',
        description: c.notes?.substring(0, 200) || null,
        date: (c.scheduledDate || c.actualDate || new Date()).toISOString(),
        professional: c.doctor ? { name: c.doctor.name, specialty: c.doctor.speciality } : null
      })),
      ...prescriptions.map(p => ({
        id: p.id,
        type: 'PRESCRIPTION' as const,
        title: 'Prescrição Médica',
        description: p.instructions?.substring(0, 200) || null,
        date: p.createdAt.toISOString(),
        professional: p.doctor ? { name: p.doctor.name, specialty: p.doctor.speciality } : null
      })),
      ...exams.map(e => ({
        id: e.id,
        type: 'EXAM' as const,
        title: e.examType || 'Exame',
        description: e.notes?.substring(0, 200) || null,
        date: e.completedDate?.toISOString() || e.requestDate.toISOString(),
        professional: e.doctor ? { name: e.doctor.name, specialty: null } : null
      }))
    ]

    // Ordenar por data
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(records)

  } catch (error) {
    logger.error('Erro ao buscar histórico médico:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar histórico' },
      { status: 500 }
    )
  }
}
