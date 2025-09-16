export interface MedicalRecordFilters {
  search?: string
  type?: string
  patientId?: string
  doctorId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface MedicalRecordCreateData {
  patientId: string
  doctorId: string
  title: string
  description: string
  diagnosis?: string
  treatment?: string
  recordType: string
  priority: string
  notes?: string
}

export interface MedicalRecordUpdateData {
  title?: string
  description?: string
  diagnosis?: string
  treatment?: string
  recordType?: string
  priority?: string
  notes?: string
}

export class MedicalRecordsService {
  // Buscar prontuários com filtros e paginação
  static async getMedicalRecords(
    filters: MedicalRecordFilters = {},
    page = 1,
    limit = 10
  ) {
    // Por enquanto, sempre usar dados mock até o banco estar configurado
    console.log('Usando dados mock para prontuários médicos')
    return this.getMockMedicalRecords(filters, page, limit)
  }

  // Dados mock para prontuários
  private static getMockMedicalRecords(
    filters: MedicalRecordFilters = {},
    page = 1,
    limit = 10
  ) {
    const mockRecords = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        title: 'Consulta de Rotina - Cardiologia',
        description: 'Paciente com histórico de hipertensão arterial',
        diagnosis: 'Hipertensão arterial sistêmica',
        treatment: 'Losartana 50mg 1x/dia, Hidroclorotiazida 25mg 1x/dia',
        recordType: 'CONSULTATION',
        priority: 'NORMAL',
        notes: 'Paciente orientado sobre dieta hipossódica e exercícios',
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
        title: 'Exame de Sangue - Hemograma',
        description: 'Solicitação de hemograma completo',
        diagnosis: 'Solicitação de exames laboratoriais',
        treatment: 'Aguardando resultados',
        recordType: 'EXAM',
        priority: 'NORMAL',
        notes: 'Paciente em jejum de 12h',
        createdAt: new Date('2024-01-16T14:30:00Z'),
        updatedAt: new Date('2024-01-16T14:30:00Z'),
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
        title: 'Emergência - Dor no Peito',
        description: 'Paciente com dor precordial aguda',
        diagnosis: 'Síndrome coronariana aguda',
        treatment: 'Aspirina 100mg, Clopidogrel 75mg, Atorvastatina 40mg',
        recordType: 'EMERGENCY',
        priority: 'HIGH',
        notes: 'Paciente encaminhado para UTI',
        createdAt: new Date('2024-01-17T10:00:00Z'),
        updatedAt: new Date('2024-01-17T10:00:00Z'),
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
    let filteredRecords = mockRecords

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredRecords = filteredRecords.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.diagnosis?.toLowerCase().includes(searchLower) ||
        r.patient.name.toLowerCase().includes(searchLower) ||
        r.doctor.name.toLowerCase().includes(searchLower)
      )
    }
    if (filters.type && filters.type !== 'ALL') {
      filteredRecords = filteredRecords.filter(r => r.recordType === filters.type)
    }
    if (filters.patientId) {
      filteredRecords = filteredRecords.filter(r => r.patientId === filters.patientId)
    }
    if (filters.doctorId) {
      filteredRecords = filteredRecords.filter(r => r.doctorId === filters.doctorId)
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const paginatedRecords = filteredRecords.slice(skip, skip + limit)

    return {
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        total: filteredRecords.length,
        pages: Math.ceil(filteredRecords.length / limit)
      }
    }
  }

  // Criar prontuário
  static async createMedicalRecord(data: MedicalRecordCreateData) {
    console.log('Criando prontuário mock:', data)
    return {
      id: Date.now().toString(),
      ...data,
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

  // Buscar prontuário por ID
  static async getMedicalRecordById(id: string) {
    console.log('Buscando prontuário mock por ID:', id)
    const mockRecords = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        title: 'Consulta de Rotina - Cardiologia',
        description: 'Paciente com histórico de hipertensão arterial',
        diagnosis: 'Hipertensão arterial sistêmica',
        treatment: 'Losartana 50mg 1x/dia',
        recordType: 'CONSULTATION',
        priority: 'NORMAL',
        notes: 'Paciente orientado sobre dieta',
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
      }
    ]
    return mockRecords.find(r => r.id === id) || null
  }

  // Atualizar prontuário
  static async updateMedicalRecord(id: string, data: MedicalRecordUpdateData) {
    console.log('Atualizando prontuário mock:', id, data)
    return {
      id,
      ...data,
      updatedAt: new Date()
    }
  }

  // Deletar prontuário
  static async deleteMedicalRecord(id: string) {
    console.log('Deletando prontuário mock:', id)
    return { success: true }
  }
}
