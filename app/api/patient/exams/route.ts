import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Buscar o paciente vinculado a este usuário
    const whereClause: any = { OR: [{ userId }] }
    if (userEmail) whereClause.OR.push({ email: userEmail })

    const patient = await prisma.patient.findFirst({ where: whereClause })

    if (!patient) {
      return NextResponse.json([])
    }

    // Buscar exames do paciente
    const examRequests = await prisma.examRequest.findMany({
      where: { patientId: patient.id },
      include: { doctor: { select: { name: true } } },
      orderBy: { requestDate: 'desc' },
      take: 50
    })

    const exams = examRequests.map(req => ({
      id: req.id,
      name: req.examType || 'Exame',
      type: 'LABORATORY',
      status: req.status,
      requestedAt: req.requestDate.toISOString(),
      performedAt: req.completedDate?.toISOString() || null,
      resultAvailable: req.status === 'COMPLETED',
      resultUrl: null,
      notes: req.notes,
      professional: req.doctor ? { name: req.doctor.name } : null
    }))

    return NextResponse.json(exams)

  } catch (error) {
    console.error('Erro ao buscar exames do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar exames' },
      { status: 500 }
    )
  }
}
