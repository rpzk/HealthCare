import { ensurePrismaConnected, getPrisma } from './db-client'
import { getPatientAccessFilter } from './patient-access'
import { logger } from '@/lib/logger'

const prisma = getPrisma()

const ADMIN_ROLES = ['ADMIN', 'OWNER', 'MANAGER']

/** Contexto do usuário para filtrar dados do dashboard (RBAC) */
export interface DashboardContext {
  userId?: string
  userRole?: string
}

export class DashboardService {
  /**
   * Retorna filtro de pacientes para o usuário (vazio = ver todos, ex: ADMIN)
   */
  private static getPatientFilter(ctx?: DashboardContext) {
    if (!ctx?.userId) return {}
    if (ctx.userRole && ADMIN_ROLES.includes(ctx.userRole.toUpperCase())) return {}
    return getPatientAccessFilter(ctx.userId, ctx.userRole)
  }

  /**
   * Retorna filtro de consultas para o médico (doctorId). Admin vê todas.
   */
  private static getConsultationFilter(ctx?: DashboardContext) {
    if (!ctx?.userId) return {}
    if (ctx.userRole && ADMIN_ROLES.includes(ctx.userRole.toUpperCase())) return {}
    return { doctorId: ctx.userId }
  }

  // Buscar estatísticas principais do dashboard (filtradas por RBAC)
  static async getStats(ctx?: DashboardContext) {
    try {
      await ensurePrismaConnected()
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 7)

      const patientFilter = this.getPatientFilter(ctx)
      const consultationFilter = this.getConsultationFilter(ctx)

      const [totalPatients, consultationsToday, updatedRecords, periodTotal, periodCompleted] = await Promise.all([
        prisma.patient.count({ where: patientFilter }),
        prisma.consultation.count({
          where: {
            ...consultationFilter,
            scheduledDate: { gte: startOfDay, lte: endOfDay },
          },
        }),
        patientFilter && Object.keys(patientFilter).length > 0
          ? prisma.medicalRecord.count({
              where: {
                updatedAt: { gte: startOfDay },
                patient: { ...patientFilter },
              },
            })
          : prisma.medicalRecord.count({
              where: { updatedAt: { gte: startOfDay } },
            }),
        prisma.consultation.count({
          where: {
            ...consultationFilter,
            updatedAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.consultation.count({
          where: {
            ...consultationFilter,
            updatedAt: { gte: sevenDaysAgo },
            status: 'COMPLETED',
          },
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
      logger.error('[dashboard] erro em getStats()', err)
      throw err
    }
  }



  // Buscar próximas consultas (filtradas por médico quando aplicável)
  static async getUpcomingAppointments(limit = 3, ctx?: DashboardContext) {
    try {
      await ensurePrismaConnected()
      const now = new Date()
      const consultationFilter = this.getConsultationFilter(ctx)
      const upcoming = await prisma.consultation.findMany({
        where: {
          ...consultationFilter,
          scheduledDate: { gte: now },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      logger.error('[dashboard] erro em getUpcomingAppointments()', err)
      return []
    }
  }

  // Buscar pacientes recentes (filtrados por care team quando aplicável)
  static async getRecentPatients(limit = 3, ctx?: DashboardContext) {
    try {
      await ensurePrismaConnected()
      const patientFilter = this.getPatientFilter(ctx)
      const patients = await prisma.patient.findMany({
        where: patientFilter,
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
          status: this.getPatientStatus(p, lastConsultation),
          priority: this.getPatientPriority(p),
        }
      }).filter(Boolean); // Remove nulls
    } catch (err) {
      logger.error('[dashboard] erro em getRecentPatients()', err)
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

  private static getPatientStatus(patient: { riskLevel?: string | null }, lastConsultation: { status?: string } | null): string {
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

  private static getPatientPriority(patient: { riskLevel?: string | null }): 'normal' | 'high' {
    // Deriva prioridade do nível de risco do paciente
    const highRiskLevels = ['ALTO', 'CRITICO']
    const level = String(patient?.riskLevel || '').toUpperCase()
    return highRiskLevels.includes(level) ? 'high' : 'normal'
  }


}
