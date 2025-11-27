import { ensurePrismaConnected, getPrisma } from './db-client'

const prisma = getPrisma()

export class DashboardService {
  // Buscar estatísticas principais do dashboard
  static async getStats() {
    try {
      await ensurePrismaConnected()
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
      console.error('[dashboard] erro em getStats()', err)
      throw err
    }
  }



  // Buscar próximas consultas
  static async getUpcomingAppointments(limit = 3) {
    try {
      await ensurePrismaConnected()
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

      return upcoming.map((c, index) => {
        if (!c) {
          return null;
        }
        // Safety check for patient relation
        const patientName = c.patient ? c.patient.name : 'Paciente';
        const patientId = c.patient ? c.patient.id : undefined;
        
        return {
          id: c.id,
          consultationId: c.id,
          patientId: patientId,
          patient: patientName,
          time: new Date(c.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: this.getConsultationTypeLabel(String(c.type)),
          duration: c.duration ? `${c.duration} min` : '—',
          date: new Date(c.scheduledDate).toISOString(),
        };
      }).filter(Boolean);
    } catch (err) {
      console.error('[dashboard] erro em getUpcomingAppointments()', err)
      return []
    }
  }

  // Buscar pacientes recentes
  static async getRecentPatients(limit = 3) {
    try {
      await ensurePrismaConnected()
      const patients = await prisma.patient.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          consultations: { orderBy: { updatedAt: 'desc' }, take: 1 },
        },
      })

      if (!patients) return [];

      return patients.map((p) => {
        if (!p) return null;
        const lastConsultation = p.consultations && p.consultations.length > 0 ? p.consultations[0] : null;
        const lastVisitDate = lastConsultation?.updatedAt ?? p.updatedAt ?? p.createdAt
        return {
          id: p.id,
          name: p.name,
          age: this.calculateAge(p.birthDate as unknown as Date),
          lastVisit: new Date(lastVisitDate).toLocaleDateString('pt-BR'),
          status: this.getPatientStatus(p as any, lastConsultation as any),
          priority: this.getPatientPriority(p as any),
        }
      }).filter(Boolean); // Remove nulls
    } catch (err) {
      console.error('[dashboard] erro em getRecentPatients()', err)
      // Return empty array instead of throwing
      return []
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


}
