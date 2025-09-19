import * as prismaLib from './prisma'
const prisma = prismaLib.prisma

export class DashboardService {
  // Buscar estatísticas principais do dashboard (com fallback seguro)
  static async getStats() {
    try {
  await prismaLib.ensurePrismaConnected()

      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 7)

      const [totalPatients, consultationsToday, updatedRecords, periodTotal, periodCompleted] = await Promise.all([
        prisma.patient.count(),
        prisma.consultation.count({
          where: {
            scheduledDate: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.medicalRecord.count({
          where: { updatedAt: { gte: startOfDay } },
        }),
        prisma.consultation.count({
          where: { updatedAt: { gte: sevenDaysAgo } },
        }),
        prisma.consultation.count({
          where: { updatedAt: { gte: sevenDaysAgo }, status: 'COMPLETED' },
        }),
      ])

      const completionRate = periodTotal > 0 ? Math.round((periodCompleted / periodTotal) * 100) : 0

      return {
        totalPatients,
        consultationsToday,
        updatedRecords,
        completionRate,
      }
    } catch (err) {
      console.warn('[dashboard] fallback para dados mock em getStats()', err)
      return this.getMockStats()
    }
  }

  // Dados mock para quando o banco não estiver disponível
  private static getMockStats() {
    return {
      totalPatients: 156,
      consultationsToday: 8,
      updatedRecords: 23,
      completionRate: 87,
    }
  }

  // Buscar próximas consultas
  static async getUpcomingAppointments(limit = 3) {
    try {
  await prismaLib.ensurePrismaConnected()

      const now = new Date()
      const upcoming = await prisma.consultation.findMany({
        where: {
          scheduledDate: { gte: now },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] as any },
        },
        orderBy: { scheduledDate: 'asc' },
        take: limit,
        select: {
          id: true,
          scheduledDate: true,
          type: true,
          duration: true,
          patient: { select: { id: true, name: true } },
        },
      })

      return upcoming.map((c) => ({
        id: c.id,
        consultationId: c.id,
        patientId: c.patient?.id,
        patient: c.patient?.name ?? 'Paciente',
        time: new Date(c.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: this.getConsultationTypeLabel(String(c.type)),
        duration: c.duration ? `${c.duration} min` : '—',
        date: new Date(c.scheduledDate).toISOString(),
      }))
    } catch (err) {
      console.warn('[dashboard] fallback para dados mock em getUpcomingAppointments()', err)
      return this.getMockAppointments(limit)
    }
  }

  // Buscar pacientes recentes
  static async getRecentPatients(limit = 3) {
    try {
  await prismaLib.ensurePrismaConnected()

      const patients = await prisma.patient.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          consultations: { orderBy: { updatedAt: 'desc' }, take: 1 },
        },
      })

      return patients.map((p) => {
        const lastConsultation = p.consultations?.[0]
        const lastVisitDate = lastConsultation?.updatedAt ?? p.updatedAt ?? p.createdAt
        return {
          id: p.id,
          name: p.name,
          age: this.calculateAge(p.birthDate as unknown as Date),
          lastVisit: new Date(lastVisitDate).toLocaleDateString('pt-BR'),
          status: this.getPatientStatus(p as any, lastConsultation as any),
          priority: this.getPatientPriority(p as any),
        }
      })
    } catch (err) {
      console.warn('[dashboard] fallback para dados mock em getRecentPatients()', err)
      return this.getMockPatients(limit)
    }
  }

  // Métodos auxiliares
  private static calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  private static getConsultationTypeLabel(type: string): string {
    const typeLabels: Record<string, string> = {
      'INITIAL': 'Consulta inicial',
      'FOLLOW_UP': 'Retorno',
      'EMERGENCY': 'Emergência',
      'ROUTINE': 'Consulta de rotina',
      'SPECIALIST': 'Especialista'
    }
    return typeLabels[type] || type
  }

  private static getPatientStatus(patient: any, lastConsultation: any): string {
    if (!lastConsultation) return 'Novo paciente'
    
    switch (lastConsultation.status) {
      case 'SCHEDULED':
        return 'Consulta agendada'
      case 'IN_PROGRESS':
        return 'Em atendimento'
      case 'COMPLETED':
        return 'Última consulta concluída'
      case 'CANCELLED':
        return 'Última consulta cancelada'
      case 'NO_SHOW':
        return 'Faltou na última consulta'
      default:
        return 'Em acompanhamento'
    }
  }

  private static getPatientPriority(patient: any): 'normal' | 'high' {
    // Deriva prioridade do nível de risco do paciente
    const highRiskLevels = ['ALTO', 'CRITICO']
    const level = String(patient?.riskLevel || '').toUpperCase()
    return highRiskLevels.includes(level) ? 'high' : 'normal'
  }

  // Métodos mock para quando o banco não estiver disponível
  private static getMockAppointments(limit: number) {
    const mockAppointments = [
      {
        id: '1',
        patient: 'Maria Silva',
        time: '09:00',
        type: 'Consulta inicial',
        duration: '30 min'
      },
      {
        id: '2',
        patient: 'João Santos',
        time: '10:30',
        type: 'Retorno',
        duration: '20 min'
      },
      {
        id: '3',
        patient: 'Ana Costa',
        time: '14:00',
        type: 'Emergência',
        duration: '45 min'
      }
    ]
    
    return mockAppointments.slice(0, limit)
  }

  private static getMockPatients(limit: number) {
    const mockPatients = [
      {
        id: '1',
        name: 'Maria Silva',
        age: 45,
        lastVisit: '15/09/2025',
        status: 'Última consulta concluída',
        priority: 'normal' as const
      },
      {
        id: '2',
        name: 'João Santos',
        age: 32,
        lastVisit: '14/09/2025',
        status: 'Consulta agendada',
        priority: 'high' as const
      },
      {
        id: '3',
        name: 'Ana Costa',
        age: 28,
        lastVisit: '13/09/2025',
        status: 'Em acompanhamento',
        priority: 'normal' as const
      }
    ]
    
    return mockPatients.slice(0, limit)
  }
}
