import { prisma } from '@/lib/prisma'

export class DashboardService {
  // Buscar estatísticas principais do dashboard
  static async getStats() {
    try {
      // Total de pacientes
      const totalPatients = await prisma.patient.count()

      // Consultas hoje
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const consultationsToday = await prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      })

      // Prontuários atualizados (último mês)
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const updatedRecords = await prisma.medicalRecord.count({
        where: {
          updatedAt: {
            gte: lastMonth
          }
        }
      })

      // Taxa de conclusão de consultas (último mês)
      const totalConsultationsLastMonth = await prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: lastMonth
          }
        }
      })

      const completedConsultationsLastMonth = await prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: lastMonth
          },
          status: 'COMPLETED'
        }
      })

      const completionRate = totalConsultationsLastMonth > 0 
        ? Math.round((completedConsultationsLastMonth / totalConsultationsLastMonth) * 100)
        : 0

      return {
        totalPatients,
        consultationsToday,
        updatedRecords,
        completionRate
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      throw error
    }
  }

  // Buscar próximas consultas
  static async getUpcomingAppointments(limit = 3) {
    try {
      const appointments = await prisma.consultation.findMany({
        where: {
          scheduledDate: {
            gte: new Date()
          },
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS']
          }
        },
        include: {
          patient: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        },
        take: limit
      })

      return appointments.map(appointment => ({
        id: appointment.id,
        patient: appointment.patient.name,
        time: appointment.scheduledDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: this.getConsultationTypeLabel(appointment.type),
        duration: appointment.duration ? `${appointment.duration} min` : '30 min'
      }))
    } catch (error) {
      console.error('Erro ao buscar próximas consultas:', error)
      throw error
    }
  }

  // Buscar pacientes recentes
  static async getRecentPatients(limit = 3) {
    try {
      const patients = await prisma.patient.findMany({
        include: {
          consultations: {
            select: {
              scheduledDate: true,
              status: true
            },
            orderBy: {
              scheduledDate: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: limit
      })

      return patients.map(patient => {
        const lastConsultation = patient.consultations[0]
        const age = this.calculateAge(patient.birthDate)
        
        return {
          id: patient.id,
          name: patient.name,
          age,
          lastVisit: lastConsultation 
            ? lastConsultation.scheduledDate.toLocaleDateString('pt-BR')
            : 'Nunca',
          status: this.getPatientStatus(patient, lastConsultation),
          priority: this.getPatientPriority(patient)
        }
      })
    } catch (error) {
      console.error('Erro ao buscar pacientes recentes:', error)
      throw error
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
    // Lógica para determinar prioridade baseada em condições crônicas
    const criticalConditions = ['diabetes', 'hipertensão', 'cardiopatia']
    const hasHighPriorityCondition = patient.chronicDiseases?.some((disease: string) => 
      criticalConditions.some(condition => 
        disease.toLowerCase().includes(condition.toLowerCase())
      )
    )
    
    return hasHighPriorityCondition ? 'high' : 'normal'
  }
}
