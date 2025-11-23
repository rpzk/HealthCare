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
  latitude?: number
  longitude?: number
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

      // 1. Verificar se já existe uma Pessoa com este CPF
      let personId: string | undefined

      if (data.cpf) {
        const existingPerson = await prisma.person.findUnique({
          where: { cpf: data.cpf }
        })
        if (existingPerson) {
          personId = existingPerson.id
        }
      }

      // 2. Se não existir pessoa, criar uma nova
      if (!personId) {
        const newPerson = await prisma.person.create({
          data: {
            name: data.name,
            cpf: data.cpf,
            birthDate: data.birthDate,
            gender: data.gender,
            email: data.email,
            phone: data.phone,
            // Mapear outros campos se disponíveis no futuro
          }
        })
        personId = newPerson.id
      }

      // 3. Criar o Paciente vinculado à Pessoa
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
          userId: data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          personId: personId // Vínculo com a Pessoa
        },
        include: {
          User: {
            select: {
              name: true,
              speciality: true
            }
          },
          person: true // Incluir dados da pessoa no retorno
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
