export class DashboardService {
  // Buscar estatísticas principais do dashboard
  static async getStats() {
    // Por enquanto, sempre usar dados mock até o banco estar configurado
    console.log('Usando dados mock para estatísticas do dashboard')
    return this.getMockStats()
  }

  // Dados mock para quando o banco não estiver disponível
  private static getMockStats() {
    return {
      totalPatients: 156,
      consultationsToday: 8,
      updatedRecords: 23,
      completionRate: 87
    }
  }

  // Buscar próximas consultas
  static async getUpcomingAppointments(limit = 3) {
    // Por enquanto, sempre usar dados mock até o banco estar configurado
    console.log('Usando dados mock para próximas consultas')
    return this.getMockAppointments(limit)
  }

  // Buscar pacientes recentes
  static async getRecentPatients(limit = 3) {
    // Por enquanto, sempre usar dados mock até o banco estar configurado
    console.log('Usando dados mock para pacientes recentes')
    return this.getMockPatients(limit)
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
