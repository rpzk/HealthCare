import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'
import { formatCPF, serializeBirthDateToIsoNoonUtc } from '@/lib/patient-schemas'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    const lookup = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientId: true, email: true },
    })

    const patient = lookup?.patientId
      ? await prisma.patient.findUnique({ where: { id: lookup.patientId } })
      : lookup?.email
        ? await prisma.patient.findFirst({ where: { email: { equals: lookup.email, mode: 'insensitive' } } })
        : null

    if (!patient) {
      return NextResponse.json({ 
        error: 'Paciente não encontrado',
        message: 'Seu perfil de paciente ainda não foi criado'
      }, { status: 404 })
    }

    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const nextWeek = addDays(today, 7)

    // Buscar prescrições ativas
    const activePrescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patient.id,
        OR: [
          { status: 'ACTIVE' },
          {
            endDate: { gte: today }
          }
        ]
      },
      include: { items: { include: { medication: true } }, doctor: { select: { name: true } } },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Processar medicamentos do dia
    const medications = activePrescriptions.flatMap(prescription =>
      prescription.items.map(item => ({
        id: item.id,
        prescriptionId: prescription.id,
        name: item.medication?.name || item.customName || 'Medicamento',
        dosage: item.dosage,
        frequency: item.frequency,
        instructions: item.instructions,
        // Extrair horários da frequência (simplificado)
        times: extractTimesFromFrequency(item.frequency),
        taken: [] // TODO: Implementar tracking de tomada de medicamentos
      }))
    )

    // Buscar próximas consultas
    const upcomingAppointments = await prisma.consultation.findMany({
      where: {
        patientId: patient.id,
        scheduledDate: { gte: today, lte: nextWeek },
        status: { in: ['SCHEDULED'] }
      },
      include: { doctor: { select: { id: true, name: true, speciality: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 5
    })

    const appointments = upcomingAppointments.map(apt => ({
      id: apt.id,
      date: apt.scheduledDate.toISOString().split('T')[0],
      time: apt.scheduledDate.toTimeString().substring(0, 5),
      doctor: apt.doctor?.name || 'Profissional',
      specialty: apt.doctor?.speciality || 'Clínico Geral',
      type: apt.type || 'Consulta',
      status: apt.status
    }))

    // Buscar últimos sinais vitais
    const latestVitals = await prisma.vitalSigns.findFirst({
      where: {
        patientId: patient.id
      },
      orderBy: { recordedAt: 'desc' }
    })

    // Buscar exames pendentes
    const pendingExams = await prisma.examRequest.count({
      where: {
        patientId: patient.id,
        status: { in: ['SCHEDULED', 'REQUESTED'] }
      }
    })

    // Buscar notificações não lidas
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: userId,
        read: false
      }
    })

    // Metas de saúde (por enquanto estático, pode ser dinâmico no futuro)
    const healthGoals = [
      { id: '1', title: 'Água', target: 8, current: 5, unit: 'copos', icon: 'water' },
      { id: '2', title: 'Passos', target: 8000, current: 0, unit: 'passos', icon: 'steps' },
      { id: '3', title: 'Sono', target: 8, current: 7, unit: 'horas', icon: 'sleep' }
    ]

    return NextResponse.json({
      patient: {
        id: patient.id,
        name: patient.name,
        cpf: formatCPF(decrypt(patient.cpf as string | null)),
        birthDate: serializeBirthDateToIsoNoonUtc(patient.birthDate)
      },
      medications,
      appointments,
      activePrescriptionsCount: activePrescriptions.length,
      latestVitals: latestVitals ? {
        systolicBP: latestVitals.systolicBP,
        diastolicBP: latestVitals.diastolicBP,
        heartRate: latestVitals.heartRate,
        temperature: latestVitals.temperature,
        weight: latestVitals.weight,
        recordedAt: latestVitals.recordedAt
      } : null,
      pendingExams,
      unreadNotifications,
      healthGoals
    })

  } catch (error) {
    logger.error('Erro ao buscar dados do paciente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para extrair horários da frequência
function extractTimesFromFrequency(frequency: string): string[] {
  if (!frequency) return ['08:00']
  
  const freq = frequency.toLowerCase()
  
  if (freq.includes('1x') || freq.includes('uma vez')) {
    return ['08:00']
  }
  if (freq.includes('2x') || freq.includes('duas vezes')) {
    return ['08:00', '20:00']
  }
  if (freq.includes('3x') || freq.includes('três vezes') || freq.includes('tres vezes')) {
    return ['08:00', '14:00', '20:00']
  }
  if (freq.includes('4x') || freq.includes('quatro vezes')) {
    return ['06:00', '12:00', '18:00', '22:00']
  }
  if (freq.includes('6/6') || freq.includes('a cada 6')) {
    return ['06:00', '12:00', '18:00', '00:00']
  }
  if (freq.includes('8/8') || freq.includes('a cada 8')) {
    return ['06:00', '14:00', '22:00']
  }
  if (freq.includes('12/12') || freq.includes('a cada 12')) {
    return ['08:00', '20:00']
  }
  
  return ['08:00']
}
