import { PrismaClient, Gender, BloodType } from '@prisma/client'

const prisma = new PrismaClient()

export interface PatientCreateData {
  name: string
  email?: string
  cpf: string
  rg?: string
  birthDate: Date
  gender: Gender
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  emergencyContact?: string
  bloodType?: BloodType
  allergies: string[]
  chronicDiseases: string[]
  doctorId: string
}

export interface PatientUpdateData extends Partial<PatientCreateData> {
  isActive?: boolean
}

export interface PatientFilters {
  search?: string
  bloodType?: BloodType
  gender?: Gender
  isActive?: boolean
  ageRange?: {
    min: number
    max: number
  }
}

export class PatientService {
  // Buscar todos os pacientes com filtros e paginação
  static async getPatients(filters: PatientFilters = {}, page = 1, limit = 10) {
    try {
      const { search, bloodType, gender, isActive, ageRange } = filters
      
      // Construir filtros do Prisma
      const where: any = {}
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search.replace(/[^\d]/g, '') } }
        ]
      }
      
      if (bloodType) where.bloodType = bloodType
      if (gender) where.gender = gender
      if (isActive !== undefined) where.isActive = isActive

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
            doctor: {
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

      // Processar dados para retorno
      const processedPatients = patients.map(patient => ({
        ...patient,
        age: this.calculateAge(patient.birthDate),
        lastConsultation: patient.consultations[0] || null,
        totalConsultations: patient._count.consultations,
        totalPrescriptions: patient._count.prescriptions,
        totalRecords: patient._count.medicalRecords
      }))

      return {
        patients: processedPatients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      throw error
    }
  }

  // Buscar paciente por ID
  static async getPatientById(id: string) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          doctor: {
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
            },
            take: 10
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
              createdAt: 'desc'
            },
            take: 5
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
            },
            take: 10
          },
          vitalSigns: {
            orderBy: {
              recordedAt: 'desc'
            },
            take: 5
          }
        }
      })

      if (!patient) {
        throw new Error('Paciente não encontrado')
      }

      return {
        ...patient,
        age: this.calculateAge(patient.birthDate)
      }
    } catch (error) {
      console.error('Erro ao buscar paciente:', error)
      throw error
    }
  }

  // Criar novo paciente
  static async createPatient(data: PatientCreateData) {
    try {
      // Verificar se CPF já existe
      const existingPatient = await prisma.patient.findUnique({
        where: { cpf: data.cpf }
      })

      if (existingPatient) {
        throw new Error('Já existe um paciente com este CPF')
      }

      // Verificar se email já existe (se fornecido)
      if (data.email) {
        const existingEmail = await prisma.patient.findUnique({
          where: { email: data.email }
        })

        if (existingEmail) {
          throw new Error('Já existe um paciente com este email')
        }
      }

      const patient = await prisma.patient.create({
        data: {
          ...data,
          birthDate: new Date(data.birthDate)
        },
        include: {
          doctor: {
            select: {
              name: true,
              speciality: true
            }
          }
        }
      })

      return {
        ...patient,
        age: this.calculateAge(patient.birthDate)
      }
    } catch (error) {
      console.error('Erro ao criar paciente:', error)
      throw error
    }
  }

  // Atualizar paciente
  static async updatePatient(id: string, data: PatientUpdateData) {
    try {
      // Verificar se paciente existe
      const existingPatient = await prisma.patient.findUnique({
        where: { id }
      })

      if (!existingPatient) {
        throw new Error('Paciente não encontrado')
      }

      // Verificar CPF único (se alterado)
      if (data.cpf && data.cpf !== existingPatient.cpf) {
        const cpfExists = await prisma.patient.findUnique({
          where: { cpf: data.cpf }
        })

        if (cpfExists) {
          throw new Error('Já existe um paciente com este CPF')
        }
      }

      // Verificar email único (se alterado)
      if (data.email && data.email !== existingPatient.email) {
        const emailExists = await prisma.patient.findUnique({
          where: { email: data.email }
        })

        if (emailExists) {
          throw new Error('Já existe um paciente com este email')
        }
      }

      const updateData: any = { ...data }
      if (data.birthDate) {
        updateData.birthDate = new Date(data.birthDate)
      }

      const patient = await prisma.patient.update({
        where: { id },
        data: updateData,
        include: {
          doctor: {
            select: {
              name: true,
              speciality: true
            }
          }
        }
      })

      return {
        ...patient,
        age: this.calculateAge(patient.birthDate)
      }
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error)
      throw error
    }
  }

  // Desativar paciente (soft delete)
  static async deactivatePatient(id: string) {
    try {
      return await prisma.patient.update({
        where: { id },
        data: { isActive: false }
      })
    } catch (error) {
      console.error('Erro ao desativar paciente:', error)
      throw error
    }
  }

  // Reativar paciente
  static async reactivatePatient(id: string) {
    try {
      return await prisma.patient.update({
        where: { id },
        data: { isActive: true }
      })
    } catch (error) {
      console.error('Erro ao reativar paciente:', error)
      throw error
    }
  }

  // Buscar estatísticas de pacientes
  static async getPatientStats() {
    try {
      const [
        totalActive,
        totalInactive,
        byGender,
        byBloodType,
        byAgeGroup
      ] = await Promise.all([
        prisma.patient.count({ where: { isActive: true } }),
        prisma.patient.count({ where: { isActive: false } }),
        prisma.patient.groupBy({
          by: ['gender'],
          _count: true,
          where: { isActive: true }
        }),
        prisma.patient.groupBy({
          by: ['bloodType'],
          _count: true,
          where: { isActive: true, bloodType: { not: null } }
        }),
        // Estatísticas de idade precisam ser calculadas em código
        prisma.patient.findMany({
          where: { isActive: true },
          select: { birthDate: true }
        })
      ])

      // Calcular grupos de idade
      const currentYear = new Date().getFullYear()
      const ageGroups = {
        '0-18': 0,
        '19-35': 0,
        '36-60': 0,
        '60+': 0
      }

      byAgeGroup.forEach(patient => {
        const age = currentYear - patient.birthDate.getFullYear()
        if (age <= 18) ageGroups['0-18']++
        else if (age <= 35) ageGroups['19-35']++
        else if (age <= 60) ageGroups['36-60']++
        else ageGroups['60+']++
      })

      return {
        total: totalActive + totalInactive,
        active: totalActive,
        inactive: totalInactive,
        byGender: byGender.reduce((acc, item) => {
          acc[item.gender] = item._count
          return acc
        }, {} as Record<string, number>),
        byBloodType: byBloodType.reduce((acc, item) => {
          acc[item.bloodType!] = item._count
          return acc
        }, {} as Record<string, number>),
        byAgeGroup: ageGroups
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de pacientes:', error)
      throw error
    }
  }

  // Método auxiliar para calcular idade
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
}
