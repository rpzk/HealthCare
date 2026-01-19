import { ConsultationStatus, ConsultationType } from '@prisma/client'
import { prisma } from './prisma'

export interface ConsultationFilters {
  patientId?: string
  doctorId?: string
  status?: ConsultationStatus
  type?: ConsultationType
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface ConsultationCreateData {
  patientId: string
  doctorId: string
  scheduledDate: Date
  type: ConsultationType
  description?: string
  notes?: string
  duration?: number // em minutos
}

export interface ConsultationUpdateData {
  scheduledDate?: Date
  status?: ConsultationStatus
  type?: ConsultationType
  description?: string
  notes?: string
  actualStartTime?: Date
  actualEndTime?: Date
  duration?: number
}

export interface ConsultationStats {
  total: number
  scheduled: number
  completed: number
  cancelled: number
  noShow: number
  today: number
  thisWeek: number
  thisMonth: number
}

export class ConsultationService {
  // Buscar consultas com filtros e paginação
  static async getConsultations(
    filters: ConsultationFilters = {},
    page = 1,
    limit = 10
  ) {
    const { patientId, doctorId, status, type, dateFrom, dateTo, search } = filters;
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = dateFrom;
      if (dateTo) where.scheduledDate.lte = dateTo;
    }
    if (search) {
      where.OR = [
        { chiefComplaint: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { assessment: { contains: search, mode: 'insensitive' } }
      ];
    }
    const [total, consultations] = await Promise.all([
      prisma.consultation.count({ where }),
      prisma.consultation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
        include: {
          patient: true,
          doctor: true,
          prescriptions: true,
          examRequests: true,
        },
      })
    ]);
    return { total, consultations };
  }

  // Dados mock para consultas
  private static getMockConsultations(
    filters: ConsultationFilters = {},
    page = 1,
    limit = 10
  ) {
    const mockConsultations = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        scheduledDate: new Date('2024-01-15T09:00:00Z'),
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        description: 'Consulta de rotina',
        notes: 'Paciente com histórico de hipertensão',
        duration: 30,
        actualStartTime: null,
        actualEndTime: null,
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z'),
        patient: {
          id: '1',
          name: 'Maria Santos',
          email: 'maria@email.com',
          phone: '(11) 99999-9999',
          birthDate: new Date('1980-05-15'),
          gender: 'FEMALE'
        },
        doctor: {
          id: '1',
          name: 'Dr. João Silva',
          email: 'joao@healthcare.com',
          speciality: 'Cardiologia',
          crmNumber: '12345-SP'
        }
      },
      {
        id: '2',
        patientId: '2',
        doctorId: '2',
        scheduledDate: new Date('2024-01-16T14:30:00Z'),
        status: 'COMPLETED',
        type: 'FOLLOW_UP',
        description: 'Retorno pós-cirurgia',
        notes: 'Paciente recuperando bem',
        duration: 45,
        actualStartTime: new Date('2024-01-16T14:30:00Z'),
        actualEndTime: new Date('2024-01-16T15:15:00Z'),
        createdAt: new Date('2024-01-12T11:00:00Z'),
        updatedAt: new Date('2024-01-16T15:15:00Z'),
        patient: {
          id: '2',
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '(11) 88888-8888',
          birthDate: new Date('1975-03-20'),
          gender: 'MALE'
        },
        doctor: {
          id: '2',
          name: 'Dra. Ana Costa',
          email: 'ana@healthcare.com',
          speciality: 'Ortopedia',
          crmNumber: '67890-SP'
        }
      },
      {
        id: '3',
        patientId: '3',
        doctorId: '1',
        scheduledDate: new Date('2024-01-17T10:00:00Z'),
        status: 'CANCELLED',
        type: 'EMERGENCY',
        description: 'Consulta de emergência cancelada',
        notes: 'Paciente cancelou por motivos pessoais',
        duration: 60,
        actualStartTime: null,
        actualEndTime: null,
        createdAt: new Date('2024-01-13T09:00:00Z'),
        updatedAt: new Date('2024-01-16T08:00:00Z'),
        patient: {
          id: '3',
          name: 'Pedro Oliveira',
          email: 'pedro@email.com',
          phone: '(11) 77777-7777',
          birthDate: new Date('1990-08-10'),
          gender: 'MALE'
        },
        doctor: {
          id: '1',
          name: 'Dr. João Silva',
          email: 'joao@healthcare.com',
          speciality: 'Cardiologia',
          crmNumber: '12345-SP'
        }
      }
    ]

    // Aplicar filtros básicos
    let filteredConsultations = mockConsultations

    if (filters.patientId) {
      filteredConsultations = filteredConsultations.filter(c => c.patientId === filters.patientId)
    }
    if (filters.doctorId) {
      filteredConsultations = filteredConsultations.filter(c => c.doctorId === filters.doctorId)
    }
    if (filters.status) {
      filteredConsultations = filteredConsultations.filter(c => c.status === filters.status)
    }
    if (filters.type) {
      filteredConsultations = filteredConsultations.filter(c => c.type === filters.type)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredConsultations = filteredConsultations.filter(c => 
        c.patient.name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.doctor.name.toLowerCase().includes(searchLower)
      )
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const paginatedConsultations = filteredConsultations.slice(skip, skip + limit)

    return {
      consultations: paginatedConsultations,
      pagination: {
        page,
        limit,
        total: filteredConsultations.length,
        pages: Math.ceil(filteredConsultations.length / limit)
      }
    }
  }

  // Criar consulta
  static async createConsultation(data: ConsultationCreateData) {
    const consultation = await prisma.consultation.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledDate: data.scheduledDate,
        type: data.type,
  chiefComplaint: data.description,
        notes: data.notes,
        duration: data.duration,
        status: 'SCHEDULED',
      },
      include: {
        patient: true,
        doctor: true,
      }
    });
    return consultation;
  }

  // Buscar consulta por ID
  static async getConsultationById(id: string) {
    console.log('Buscando consulta mock por ID:', id)
    const mockConsultations = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        scheduledDate: new Date('2024-01-15T09:00:00Z'),
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        description: 'Consulta de rotina',
        notes: 'Paciente com histórico de hipertensão',
        duration: 30,
        actualStartTime: null,
        actualEndTime: null,
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z'),
        patient: {
          id: '1',
          name: 'Maria Santos',
          email: 'maria@email.com',
          phone: '(11) 99999-9999'
        },
        doctor: {
          id: '1',
          name: 'Dr. João Silva',
          email: 'joao@healthcare.com',
          speciality: 'Cardiologia',
          crmNumber: '12345-SP'
        }
      }
    ]
    return mockConsultations.find(c => c.id === id) || null
  }

  // Atualizar consulta
  static async updateConsultation(id: string, data: ConsultationUpdateData) {
    console.log('Atualizando consulta mock:', id, data)
    return {
      id,
      ...data,
      updatedAt: new Date()
    }
  }

  // Cancelar consulta
  static async cancelConsultation(id: string, reason?: string) {
    console.log('Cancelando consulta mock:', id, reason)
    return {
      id,
      status: 'CANCELLED',
      notes: reason || 'Consulta cancelada',
      updatedAt: new Date()
    }
  }

  // Iniciar consulta
  static async startConsultation(id: string) {
    console.log('Iniciando consulta mock:', id)
    return {
      id,
      status: 'IN_PROGRESS',
      actualStartTime: new Date(),
      updatedAt: new Date()
    }
  }

  // Marcar como concluída
  static async completeConsultation(id: string, notes?: string) {
    console.log('Concluindo consulta mock:', id, notes)
    return {
      id,
      status: 'COMPLETED',
      notes: notes || 'Consulta concluída',
      actualEndTime: new Date(),
      updatedAt: new Date()
    }
  }

  // Marcar como não compareceu
  static async markNoShow(id: string) {
    console.log('Marcando como não compareceu mock:', id)
    return {
      id,
      status: 'NO_SHOW',
      updatedAt: new Date()
    }
  }

  // Alias para compatibilidade com a rota PATCH (usa markAsNoShow)
  static async markAsNoShow(id: string) {
    return this.markNoShow(id)
  }

  // Estatísticas de consultas
  static async getConsultationStats(filters: ConsultationFilters = {}) {
    console.log('Buscando estatísticas mock de consultas')
    return {
      total: 3,
      scheduled: 1,
      completed: 1,
      cancelled: 1,
      noShow: 0,
      today: 0,
      thisWeek: 2,
      thisMonth: 3
    }
  }

  // Compatibility alias expected by some routes
  static async getStats(filters: ConsultationFilters = {}) {
    return this.getConsultationStats(filters)
  }

  // Consultas de hoje
  static async getTodayConsultations(doctorId?: string) {
    console.log('Buscando consultas de hoje mock', doctorId)
    // Return empty array for now; could filter mock data by doctorId
    return []
  }

  // Próximas consultas
  static async getUpcomingConsultations(doctorId?: string, limit = 5) {
    console.log('Buscando próximas consultas mock', doctorId, limit)
    return []
  }

  // Available slots for a doctor on a given date (return Date[])
  static async getAvailableSlots(doctorId: string, date: Date) {
    console.log('Buscando horários disponíveis mock for', doctorId, date.toISOString())
    // Return a few slots for the middle of the day
    const base = new Date(date)
    base.setHours(9, 0, 0, 0)
    return [0, 30, 60, 90].map(mins => {
      const d = new Date(base)
      d.setMinutes(base.getMinutes() + mins)
      return d
    })
  }
}
