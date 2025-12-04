import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Buscar o paciente vinculado a este usuário
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: userId },
          { email: userEmail }
        ]
      },
      include: {
        user: true
      }
    })

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
            expiresAt: {
              gte: today
            }
          }
        ]
      },
      include: {
        prescriptionItems: {
          include: {
            medication: true
          }
        },
        prescriber: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Processar medicamentos do dia
    const medications = activePrescriptions.flatMap(prescription => 
      prescription.prescriptionItems.map(item => ({
        id: item.id,
        prescriptionId: prescription.id,
        name: item.medication?.name || item.medicationName || 'Medicamento',
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
        scheduledAt: {
          gte: today,
          lte: nextWeek
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: 5
    })

    const appointments = upcomingAppointments.map(apt => ({
      id: apt.id,
      date: apt.scheduledAt.toISOString().split('T')[0],
      time: apt.scheduledAt.toTimeString().substring(0, 5),
      doctor: apt.professional?.name || 'Profissional',
      specialty: apt.professional?.specialty || 'Clínico Geral',
      type: apt.type || 'Consulta',
      status: apt.status
    }))

    // Buscar últimos sinais vitais
    const latestVitals = await prisma.vitalSigns.findFirst({
      where: {
        patientId: patient.id
      },
      orderBy: {
        measuredAt: 'desc'
      }
    })

    // Buscar exames pendentes
    const pendingExams = await prisma.exam.count({
      where: {
        patientId: patient.id,
        status: {
          in: ['SCHEDULED', 'PENDING']
        }
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
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        bloodType: patient.bloodType
      },
      medications,
      appointments,
      activePrescriptionsCount: activePrescriptions.length,
      latestVitals: latestVitals ? {
        bloodPressureSystolic: latestVitals.bloodPressureSystolic,
        bloodPressureDiastolic: latestVitals.bloodPressureDiastolic,
        heartRate: latestVitals.heartRate,
        temperature: latestVitals.temperature,
        weight: latestVitals.weight,
        measuredAt: latestVitals.measuredAt
      } : null,
      pendingExams,
      unreadNotifications,
      healthGoals
    })

  } catch (error) {
    console.error('Erro ao buscar dados do paciente:', error)
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
