export interface ReferralFilters {
  search?: string
  patientId?: string
  doctorId?: string
  status?: string
  specialty?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ReferralCreateData {
  patientId: string
  doctorId: string
  specialty: string
  description: string
  priority: string
  notes?: string
}

export class ReferralsService {
  // Buscar encaminhamentos com filtros e paginação
  static async getReferrals(
    filters: ReferralFilters = {},
    page = 1,
    limit = 10
  ) {
    console.log('Usando dados mock para encaminhamentos')
    return this.getMockReferrals(filters, page, limit)
  }

  // Dados mock para encaminhamentos
  private static getMockReferrals(
    filters: ReferralFilters = {},
    page = 1,
    limit = 10
  ) {
    const mockReferrals = [
      {
        id: '1',
        patientId: '1',
        doctorId: '1',
        specialty: 'Cardiologia',
        description: 'Avaliação de sopro cardíaco',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: 'Preferência por atendimento no período da manhã',
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
          speciality: 'Clínica Geral'
        }
      },
      {
        id: '2',
        patientId: '2',
        doctorId: '2',
        specialty: 'Fisioterapia',
        description: 'Reabilitação de lesão no ombro',
        priority: 'HIGH',
        status: 'COMPLETED',
        notes: 'Paciente com dor moderada',
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
          speciality: 'Ortopedia'
        }
      }
    ]

    // Aplicar filtros básicos
    let filtered = mockReferrals

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(r =>
        r.patient.name.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.specialty.toLowerCase().includes(searchLower) ||
        r.notes?.toLowerCase().includes(searchLower)
      )
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status)
    }
    if (filters.specialty) {
      filtered = filtered.filter(r => r.specialty === filters.specialty)
    }
    if (filters.patientId) {
      filtered = filtered.filter(r => r.patientId === filters.patientId)
    }
    if (filters.doctorId) {
      filtered = filtered.filter(r => r.doctorId === filters.doctorId)
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const paginated = filtered.slice(skip, skip + limit)

    return {
      referrals: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit)
      }
    }
  }

  // Criar encaminhamento
  static async createReferral(data: ReferralCreateData) {
    console.log('Criando encaminhamento mock:', data)
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

  // Stubs para update/delete se necessário
  static async getReferralById(id: string) {
    console.log('Buscando encaminhamento mock por ID:', id)
    return null
  }

  static async updateReferral(id: string, data: any) {
    console.log('Atualizando encaminhamento mock:', id, data)
    return { id, ...data, updatedAt: new Date() }
  }

  static async deleteReferral(id: string) {
    console.log('Deletando encaminhamento mock:', id)
    return { success: true }
  }
}
