export interface PrescriptionFilters {
  search?: string
  patientId?: string
  doctorId?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface PrescriptionCreateData {
  patientId: string
  doctorId: string
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }>
  notes?: string
  status?: string
}

export class PrescriptionsService {
  // Fonte única de dados mock para reutilização
  private static getMockData() {
    return [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        medications: [
          {
            name: 'Losartana',
            dosage: '50mg',
            frequency: '1x ao dia',
            duration: '30 dias',
            instructions: 'Tomar pela manhã'
          }
        ],
        notes: 'Paciente com hipertensão arterial',
        status: 'ACTIVE',
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
        medications: [
          {
            name: 'Dipirona',
            dosage: '500mg',
            frequency: '3x ao dia',
            duration: '7 dias',
            instructions: 'Tomar com água'
          }
        ],
        notes: 'Paciente com dor de cabeça',
        status: 'COMPLETED',
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
      }
    ]
  }
  // Buscar prescrições com filtros e paginação
  static async getPrescriptions(
    filters: PrescriptionFilters = {},
    page = 1,
    limit = 10
  ) {
    console.log('Usando dados mock para prescrições')
    return this.getMockPrescriptions(filters, page, limit)
  }

  // Dados mock para prescrições
  private static getMockPrescriptions(
    filters: PrescriptionFilters = {},
    page = 1,
    limit = 10
  ) {
    const mockPrescriptions = this.getMockData()

    // Aplicar filtros básicos
    let filteredPrescriptions = mockPrescriptions

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredPrescriptions = filteredPrescriptions.filter(p => 
        p.patient.name.toLowerCase().includes(searchLower) ||
        p.notes?.toLowerCase().includes(searchLower) ||
        p.medications.some(m => m.name.toLowerCase().includes(searchLower))
      )
    }
    if (filters.status) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.status === filters.status)
    }
    if (filters.patientId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.patientId === filters.patientId)
    }
    if (filters.doctorId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.doctorId === filters.doctorId)
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const paginatedPrescriptions = filteredPrescriptions.slice(skip, skip + limit)

    return {
      prescriptions: paginatedPrescriptions,
      pagination: {
        page,
        limit,
        total: filteredPrescriptions.length,
        pages: Math.ceil(filteredPrescriptions.length / limit)
      }
    }
  }

  // Criar prescrição
  static async createPrescription(data: PrescriptionCreateData) {
    console.log('Criando prescrição mock:', data)
    return {
      id: Date.now().toString(),
      ...data,
      status: data.status || 'ACTIVE',
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

  // Buscar prescrição por ID
  static async getPrescriptionById(id: string) {
    console.log('Buscando prescrição mock por ID:', id)
    const item = this.getMockData().find(p => p.id === id)
    return item || null
  }

  // Atualizar prescrição
  static async updatePrescription(id: string, data: any) {
    console.log('Atualizando prescrição mock:', id, data)
    const current = await this.getPrescriptionById(id)
    if (!current) return null
    const updated = {
      ...current,
      ...data,
      updatedAt: new Date()
    }
    return updated
  }

  // Deletar prescrição
  static async deletePrescription(id: string) {
    console.log('Deletando prescrição mock:', id)
    return { success: true }
  }
}
