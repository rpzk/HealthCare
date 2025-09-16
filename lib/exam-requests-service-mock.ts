export interface ExamRequestFilters {
  search?: string
  patientId?: string
  doctorId?: string
  status?: string
  type?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ExamRequestCreateData {
  patientId: string
  doctorId: string
  examType: string
  description: string
  priority: string
  notes?: string
  scheduledDate?: Date
}

export class ExamRequestsService {
  // Buscar solicitações de exame com filtros e paginação
  static async getExamRequests(
    filters: ExamRequestFilters = {},
    page = 1,
    limit = 10
  ) {
    console.log('Usando dados mock para solicitações de exame')
    return this.getMockExamRequests(filters, page, limit)
  }

  // Dados mock para solicitações de exame
  private static getMockExamRequests(
    filters: ExamRequestFilters = {},
    page = 1,
    limit = 10
  ) {
    const mockRequests = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        examType: 'HEMOGRAMA',
        description: 'Hemograma completo',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: 'Paciente em jejum de 12h',
        scheduledDate: new Date('2024-01-20T08:00:00Z'),
        createdAt: new Date('2024-01-15T09:00:00Z'),
        updatedAt: new Date('2024-01-15T09:00:00Z'),
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
          speciality: 'Cardiologia'
        }
      },
      {
        id: '2',
        patientId: '2',
        doctorId: '2',
        examType: 'RAIO_X_TORAX',
        description: 'Raio-X de tórax PA e perfil',
        priority: 'HIGH',
        status: 'COMPLETED',
        notes: 'Paciente com tosse persistente',
        scheduledDate: new Date('2024-01-18T10:00:00Z'),
        createdAt: new Date('2024-01-16T14:30:00Z'),
        updatedAt: new Date('2024-01-18T10:30:00Z'),
        patient: {
          id: '2',
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '(11) 88888-8888'
        },
        doctor: {
          id: '2',
          name: 'Dra. Ana Costa',
          email: 'ana@healthcare.com',
          speciality: 'Clínica Geral'
        }
      },
      {
        id: '3',
        patientId: '3',
        doctorId: '1',
        examType: 'ECOCARDIOGRAMA',
        description: 'Ecocardiograma transtorácico',
        priority: 'NORMAL',
        status: 'CANCELLED',
        notes: 'Paciente cancelou o exame',
        scheduledDate: new Date('2024-01-19T14:00:00Z'),
        createdAt: new Date('2024-01-17T10:00:00Z'),
        updatedAt: new Date('2024-01-18T08:00:00Z'),
        patient: {
          id: '3',
          name: 'Pedro Oliveira',
          email: 'pedro@email.com',
          phone: '(11) 77777-7777'
        },
        doctor: {
          id: '1',
          name: 'Dr. João Silva',
          email: 'joao@healthcare.com',
          speciality: 'Cardiologia'
        }
      }
    ]

    // Aplicar filtros básicos
    let filteredRequests = mockRequests

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredRequests = filteredRequests.filter(r => 
        r.patient.name.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.examType.toLowerCase().includes(searchLower) ||
        r.notes?.toLowerCase().includes(searchLower)
      )
    }
    if (filters.status) {
      filteredRequests = filteredRequests.filter(r => r.status === filters.status)
    }
    if (filters.type) {
      filteredRequests = filteredRequests.filter(r => r.examType === filters.type)
    }
    if (filters.patientId) {
      filteredRequests = filteredRequests.filter(r => r.patientId === filters.patientId)
    }
    if (filters.doctorId) {
      filteredRequests = filteredRequests.filter(r => r.doctorId === filters.doctorId)
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const paginatedRequests = filteredRequests.slice(skip, skip + limit)

    return {
      requests: paginatedRequests,
      pagination: {
        page,
        limit,
        total: filteredRequests.length,
        pages: Math.ceil(filteredRequests.length / limit)
      }
    }
  }

  // Criar solicitação de exame
  static async createExamRequest(data: ExamRequestCreateData) {
    console.log('Criando solicitação de exame mock:', data)
    return {
      id: Date.now().toString(),
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: {
        id: data.patientId,
        name: 'Paciente Mock',
        email: 'mock@email.com',
        phone: '(11) 00000-0000'
      },
      doctor: {
        id: data.doctorId,
        name: 'Dr. Mock',
        email: 'mock@healthcare.com',
        speciality: 'Geral'
      }
    }
  }

  // Buscar solicitação por ID
  static async getExamRequestById(id: string) {
    console.log('Buscando solicitação de exame mock por ID:', id)
    return null
  }

  // Atualizar solicitação
  static async updateExamRequest(id: string, data: any) {
    console.log('Atualizando solicitação de exame mock:', id, data)
    return {
      id,
      ...data,
      updatedAt: new Date()
    }
  }

  // Deletar solicitação
  static async deleteExamRequest(id: string) {
    console.log('Deletando solicitação de exame mock:', id)
    return { success: true }
  }
}
