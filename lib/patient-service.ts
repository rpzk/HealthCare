import { Gender, RiskLevel } from '@prisma/client'
// Lazy Prisma to avoid bundling/runtime issues
let __prisma: any | undefined
async function getPrisma() {
  if (!__prisma) {
    console.log('[patient-service] initializing PrismaClient')
    const { PrismaClient } = await import('@prisma/client')
    __prisma = new PrismaClient()
  }
  // console.log('[patient-service] prisma ready')
  return __prisma as any
}
import { encrypt, decrypt, hashCPF } from '@/lib/crypto'

export interface PatientCreateData {
  name: string
  email: string
  phone?: string
  cpf?: string
  birthDate: Date
  gender: Gender
  emergencyContact?: string
  address?: string
  medicalHistory?: string
  allergies?: string
  currentMedications?: string
  riskLevel?: RiskLevel
  insuranceNumber?: string
  userId?: string
}

export interface PatientUpdateData extends Partial<PatientCreateData> {
}

export interface PatientFilters {
  search?: string
  gender?: string
  riskLevel?: string
  ageRange?: { min: number, max: number }
}

export class PatientService {
  // Buscar todos os pacientes com filtros e paginação
  static async getPatients(filters: PatientFilters = {}, page = 1, limit = 10) {
    try {
      // Utilizar a implementação com Prisma (banco de dados)
      return await this.getPatientsOriginal(filters, page, limit)
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      // Fallback: dados mock apenas para não quebrar a UI
      return this.getMockPatients(filters, page, limit)
    }
  }

  // Dados mock para pacientes
  private static getMockPatients(filters: PatientFilters = {}, page = 1, limit = 10) {
    const mockPatients = [
      {
        id: '1',
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '(11) 98765-4321',
        cpf: '123.456.789-00',
        birthDate: new Date('1980-05-15'),
        gender: 'FEMALE' as const,
        emergencyContact: '(11) 98765-4322',
        address: 'Rua das Flores, 123 - São Paulo/SP',
        medicalHistory: 'Hipertensão controlada, diabetes tipo 2',
        allergies: 'Penicilina',
        currentMedications: 'Metformina 500mg, Losartana 50mg',
        riskLevel: 'MEDIO' as const,
        insuranceNumber: '123456789',
        userId: 'user1',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-09-10')
      },
      {
        id: '2',
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '(11) 91234-5678',
        cpf: '987.654.321-00',
        birthDate: new Date('1962-03-20'),
        gender: 'MALE' as const,
        emergencyContact: '(11) 91234-5679',
        address: 'Av. Paulista, 456 - São Paulo/SP',
        medicalHistory: 'Cardiopatia isquêmica, hipertensão',
        allergies: 'Nenhuma',
        currentMedications: 'AAS 100mg, Atorvastatina 20mg',
        riskLevel: 'ALTO' as const,
        insuranceNumber: '987654321',
        userId: 'user2',
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-09-12')
      },
      {
        id: '3',
        name: 'Ana Costa',
        email: 'ana.costa@email.com',
        phone: '(11) 99876-5432',
        cpf: '456.789.123-00',
        birthDate: new Date('1995-08-10'),
        gender: 'FEMALE' as const,
        emergencyContact: '(11) 99876-5433',
        address: 'Rua da Consolação, 789 - São Paulo/SP',
        medicalHistory: 'Asma leve',
        allergies: 'Poeira, ácaros',
        currentMedications: 'Budesonida inalador',
        riskLevel: 'BAIXO' as const,
        insuranceNumber: '456789123',
        userId: 'user3',
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-09-08')
      }
    ]

    // Aplicar filtros básicos
    let filteredPatients = mockPatients

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredPatients = filteredPatients.filter(patient =>
        patient.name.toLowerCase().includes(searchLower) ||
        patient.email.toLowerCase().includes(searchLower) ||
        patient.phone.includes(searchLower)
      )
    }

    if (filters.gender) {
      filteredPatients = filteredPatients.filter(patient => patient.gender === filters.gender)
    }

    if (filters.riskLevel) {
      filteredPatients = filteredPatients.filter(patient => patient.riskLevel === filters.riskLevel)
    }

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPatients = filteredPatients.slice(startIndex, endIndex)

    return {
      patients: paginatedPatients,
      pagination: {
        page,
        limit,
        total: filteredPatients.length,
        totalPages: Math.ceil(filteredPatients.length / limit)
      }
    }
  }

  // Método original (comentado para referência)
  private static async getPatientsOriginal(filters: PatientFilters = {}, page = 1, limit = 10) {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] getPatients called')
      const { search, riskLevel, gender, ageRange } = filters
      
      // Construir filtros do Prisma
      const where: any = {}
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search.replace(/[^\d]/g, '') } }
        ]
        // Se busca parece CPF completo (11 dígitos), usar hash
        const numeric = search.replace(/\D/g,'')
        if (numeric.length === 11) {
          where.OR.push({ cpfHash: hashCPF(numeric) })
        }
      }
      
      if (riskLevel) where.riskLevel = riskLevel
      if (gender) where.gender = gender

      // Filtro de idade (mais complexo, precisa calcular)
      if (ageRange) {
        const currentYear = new Date().getFullYear()
        const maxBirthYear = currentYear - ageRange.min
        const minBirthYear = currentYear - ageRange.max - 1
        
        where.birthDate = {
          gte: new Date(`${minBirthYear}-01-01`),
          lte: new Date(`${maxBirthYear}-12-31`)
        }
      }

      // Buscar pacientes com informações relacionadas
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          include: {
            User: {
              select: {
                name: true,
                speciality: true
              }
            },
            consultations: {
              select: {
                id: true,
                scheduledDate: true,
                status: true
              },
              orderBy: {
                scheduledDate: 'desc'
              },
              take: 1
            },
            _count: {
              select: {
                consultations: true,
                prescriptions: true,
                medicalRecords: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.patient.count({ where })
      ])

      return {
        patients: patients.map((patient: any) => ({
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          cpf: decrypt(patient.cpf as any),
          age: this.calculateAge(patient.birthDate),
          gender: patient.gender,
          riskLevel: patient.riskLevel,
          emergencyContact: patient.emergencyContact,
          address: patient.address,
          medicalHistory: decrypt(patient.medicalHistory as any),
          allergies: decrypt(patient.allergies as any),
          currentMedications: decrypt(patient.currentMedications as any),
          insuranceNumber: patient.insuranceNumber,
          doctor: patient.User ? {
            name: patient.User.name,
            speciality: patient.User.speciality
          } : null,
          lastConsultation: patient.consultations[0] || null,
          stats: {
            totalConsultations: patient._count.consultations,
            totalPrescriptions: patient._count.prescriptions,
            totalRecords: patient._count.medicalRecords
          },
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt
        })),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      throw error
    }
  }

  // Buscar um paciente específico por ID
  static async getPatientById(id: string) {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] getPatientById called')
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              speciality: true,
              crmNumber: true
            }
          },
          consultations: {
            include: {
              doctor: {
                select: {
                  name: true,
                  speciality: true
                }
              }
            },
            orderBy: {
              scheduledDate: 'desc'
            }
          },
          prescriptions: {
            include: {
              doctor: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              startDate: 'desc'
            }
          },
          medicalRecords: {
            include: {
              doctor: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              consultations: true,
              prescriptions: true,
              medicalRecords: true
            }
          }
        }
      })

      if (!patient) {
        throw new Error('Paciente não encontrado')
      }

      return {
        ...patient,
        age: this.calculateAge(patient.birthDate),
        doctor: patient.User ? {
          id: patient.User.id,
          name: patient.User.name,
          speciality: patient.User.speciality,
          crmNumber: patient.User.crmNumber
        } : null
      }
    } catch (error) {
      console.error('Erro ao buscar paciente:', error)
      throw error
    }
  }

  // Criar novo paciente
  static async createPatient(data: PatientCreateData) {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] createPatient called')
      const patient = await prisma.patient.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          cpf: data.cpf ? encrypt(data.cpf) : undefined,
          cpfHash: data.cpf ? hashCPF(data.cpf) : undefined,
          birthDate: data.birthDate,
          gender: data.gender,
          emergencyContact: data.emergencyContact,
          address: data.address,
          medicalHistory: data.medicalHistory ? encrypt(data.medicalHistory) : undefined,
          allergies: data.allergies ? encrypt(data.allergies) : undefined,
          currentMedications: data.currentMedications ? encrypt(data.currentMedications) : undefined,
          riskLevel: data.riskLevel || 'BAIXO',
          insuranceNumber: data.insuranceNumber,
          userId: data.userId
        },
        include: {
          User: {
            select: {
              name: true,
              speciality: true
            }
          }
        }
      })

      return {
        ...patient,
        cpf: decrypt(patient.cpf as any),
        medicalHistory: decrypt(patient.medicalHistory as any),
        allergies: decrypt(patient.allergies as any),
        currentMedications: decrypt(patient.currentMedications as any)
      }
    } catch (error) {
      console.error('Erro ao criar paciente:', error)
      throw error
    }
  }

  // Atualizar paciente
  static async updatePatient(id: string, data: PatientUpdateData) {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] updatePatient called')
      // Preparar campos criptografados
      const updateData: any = { ...data }
      if (data.cpf) {
        updateData.cpf = encrypt(data.cpf)
  updateData.cpfHash = hashCPF(data.cpf)
      }
      if (data.medicalHistory) updateData.medicalHistory = encrypt(data.medicalHistory)
      if (data.allergies) updateData.allergies = encrypt(data.allergies)
      if (data.currentMedications) updateData.currentMedications = encrypt(data.currentMedications)

      const patient = await prisma.patient.update({
        where: { id },
        data: updateData,
        include: {
          User: {
            select: {
              name: true,
              speciality: true
            }
          }
        }
      })

      return {
        ...patient,
        cpf: decrypt(patient.cpf as any),
        medicalHistory: decrypt(patient.medicalHistory as any),
        allergies: decrypt(patient.allergies as any),
        currentMedications: decrypt(patient.currentMedications as any)
      }
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error)
      throw error
    }
  }

  // Excluir paciente
  static async deletePatient(id: string) {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] deletePatient called')
      await prisma.patient.delete({
        where: { id }
      })

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir paciente:', error)
      throw error
    }
  }

  // Buscar estatísticas gerais
  static async getPatientStats() {
    try {
      const prisma = await getPrisma()
      // console.log('[patient-service] getPatientStats called')
      const [totalPatients, genderStats, riskLevelStats] = await Promise.all([
        prisma.patient.count(),
        prisma.patient.groupBy({
          by: ['gender'],
          _count: true
        }),
        prisma.patient.groupBy({
          by: ['riskLevel'],
          _count: true
        })
      ])

      const genderDistribution = (genderStats as any[]).reduce((acc: Record<string, number>, item: any) => {
        acc[item.gender] = item._count
        return acc
      }, {} as Record<string, number>)

      const riskDistribution = (riskLevelStats as any[]).reduce((acc: Record<string, number>, item: any) => {
        acc[item.riskLevel] = item._count
        return acc
      }, {} as Record<string, number>)

      return {
        totalPatients,
        genderDistribution,
        riskDistribution
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      throw error
    }
  }

  // Métodos auxiliares
  static calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  static getGenderLabel(gender: Gender): string {
    const labels = {
      'MALE': 'Masculino',
      'FEMALE': 'Feminino',
      'OTHER': 'Outro'
    }
    return labels[gender] || gender
  }

  static getRiskLevelLabel(riskLevel: RiskLevel): string {
    const labels = {
      'BAIXO': 'Baixo',
      'MEDIO': 'Médio',
      'ALTO': 'Alto',
      'CRITICO': 'Crítico'
    }
    return labels[riskLevel] || riskLevel
  }

  static getRiskLevelColor(riskLevel: RiskLevel): string {
    const colors = {
      'BAIXO': 'green',
      'MEDIO': 'yellow',
      'ALTO': 'orange',
      'CRITICO': 'red'
    }
    return colors[riskLevel] || 'gray'
  }
}
