import { Consultation, ConsultationStatus, ConsultationType } from '@prisma/client'
import { prisma, ensurePrismaConnected } from '@/lib/prisma'

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
    try {
      await ensurePrismaConnected()
    } catch (e) {
      console.error('[ConsultationService] Falha ao conectar Prisma:', e)
      throw new Error('Erro de conexão com banco de dados')
    }

    const skip = (page - 1) * limit
    
    const where: any = {}

    // Filtros básicos
    if (filters.patientId) where.patientId = filters.patientId
    if (filters.doctorId) where.doctorId = filters.doctorId
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type

    // Filtro por data
    if (filters.dateFrom || filters.dateTo) {
      where.scheduledDate = {}
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo
    }

    // Busca por texto
    if (filters.search) {
      where.OR = [
        {
          patient: {
            name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          doctor: {
            name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          description: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              birthDate: true,
              gender: true
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              speciality: true,
              crmNumber: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.consultation.count({ where })
    ])

    const pages = Math.ceil(total / limit)

    return {
      consultations,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
  }

  // Buscar consulta por ID
  static async getConsultationById(id: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            _count: {
              select: {
                consultations: true,
                medicalRecords: true,
                prescriptions: true
              }
            }
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true,
            crmNumber: true
          }
        },
        prescriptions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        vitalSigns: {
          orderBy: {
            recordedAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    return consultation
  }

  // Criar nova consulta
  static async createConsultation(data: ConsultationCreateData) {
    // Verificar se o paciente existe
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId }
    })

    if (!patient) {
      throw new Error('Paciente não encontrado')
    }

    // Verificar se o médico existe
    const doctor = await prisma.user.findUnique({
      where: { id: data.doctorId }
    })

    if (!doctor) {
      throw new Error('Médico não encontrado')
    }

    // Verificar conflitos de horário
    const conflictingConsultation = await prisma.consultation.findFirst({
      where: {
        doctorId: data.doctorId,
        scheduledDate: {
          gte: new Date(data.scheduledDate.getTime() - 30 * 60 * 1000), // 30 min antes
          lte: new Date(data.scheduledDate.getTime() + (data.duration || 60) * 60 * 1000) // duração depois
        },
        status: {
          not: 'CANCELLED'
        }
      }
    })

    if (conflictingConsultation) {
      throw new Error('Já existe uma consulta agendada neste horário')
    }

    const consultation = await prisma.consultation.create({
      data: {
        ...data,
        status: 'SCHEDULED'
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true
          }
        }
      }
    })

    return consultation
  }

  // Atualizar consulta
  static async updateConsultation(id: string, data: ConsultationUpdateData) {
    const existingConsultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!existingConsultation) {
      throw new Error('Consulta não encontrada')
    }

    // Se estiver mudando data/hora, verificar conflitos
    if (data.scheduledDate && data.scheduledDate !== existingConsultation.scheduledDate) {
      const conflictingConsultation = await prisma.consultation.findFirst({
        where: {
          id: { not: id },
          doctorId: existingConsultation.doctorId,
          scheduledDate: {
            gte: new Date(data.scheduledDate.getTime() - 30 * 60 * 1000),
            lte: new Date(data.scheduledDate.getTime() + (data.duration || 60) * 60 * 1000)
          },
          status: {
            not: 'CANCELLED'
          }
        }
      })

      if (conflictingConsultation) {
        throw new Error('Já existe uma consulta agendada neste horário')
      }
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true
          }
        }
      }
    })

    return consultation
  }

  // Iniciar consulta
  static async startConsultation(id: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    if (consultation.status !== 'SCHEDULED') {
      throw new Error('Apenas consultas agendadas podem ser iniciadas')
    }

    return await prisma.consultation.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        actualDate: new Date()
      },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            name: true,
            speciality: true
          }
        }
      }
    })
  }

  // Finalizar consulta
  static async completeConsultation(id: string, notes?: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    if (consultation.status !== 'IN_PROGRESS') {
      throw new Error('Apenas consultas em andamento podem ser finalizadas')
    }

    return await prisma.consultation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualDate: new Date(),
        notes: notes || consultation.notes
      }
    })
  }

  // Cancelar consulta
  static async cancelConsultation(id: string, reason?: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    if (consultation.status === 'COMPLETED') {
      throw new Error('Consultas já finalizadas não podem ser canceladas')
    }

    return await prisma.consultation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelada: ${reason}` : consultation.notes
      }
    })
  }

  // Marcar como faltou
  static async markAsNoShow(id: string) {
    return await prisma.consultation.update({
      where: { id },
      data: {
        status: 'NO_SHOW'
      }
    })
  }

  // Estatísticas de consultas
  static async getStats(doctorId?: string): Promise<ConsultationStats> {
    const where = doctorId ? { doctorId } : {}

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      total,
      scheduled,
      completed,
      cancelled,
      noShow,
      today,
      thisWeek,
      thisMonth
    ] = await Promise.all([
      prisma.consultation.count({ where }),
      prisma.consultation.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.consultation.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.consultation.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.consultation.count({ where: { ...where, status: 'NO_SHOW' } }),
      prisma.consultation.count({
        where: {
          ...where,
          scheduledDate: {
            gte: startOfDay,
            lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.consultation.count({
        where: {
          ...where,
          scheduledDate: {
            gte: startOfWeek
          }
        }
      }),
      prisma.consultation.count({
        where: {
          ...where,
          scheduledDate: {
            gte: startOfMonth
          }
        }
      })
    ])

    return {
      total,
      scheduled,
      completed,
      cancelled,
      noShow,
      today,
      thisWeek,
      thisMonth
    }
  }

  // Buscar consultas do dia
  static async getTodayConsultations(doctorId?: string) {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const where: any = {
      scheduledDate: {
        gte: startOfDay,
        lt: endOfDay
      }
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    return await prisma.consultation.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            birthDate: true
          }
        },
        doctor: {
          select: {
            name: true,
            speciality: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })
  }

  // Buscar próximas consultas
  static async getUpcomingConsultations(doctorId?: string, limit = 5) {
    const now = new Date()
    
    const where: any = {
      scheduledDate: {
        gte: now
      },
      status: 'SCHEDULED'
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    return await prisma.consultation.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            birthDate: true
          }
        },
        doctor: {
          select: {
            name: true,
            speciality: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: limit
    })
  }

  // Buscar horários disponíveis
  static async getAvailableSlots(doctorId: string, date: Date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0) // 8h
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0) // 18h
    
    // Buscar consultas já agendadas no dia
    const existingConsultations = await prisma.consultation.findMany({
      where: {
        doctorId,
        scheduledDate: {
          gte: startOfDay,
          lt: new Date(endOfDay.getTime() + 24 * 60 * 60 * 1000)
        },
        status: {
          not: 'CANCELLED'
        }
      },
      select: {
        scheduledDate: true,
        duration: true
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Gerar slots disponíveis (a cada 30 minutos)
    const availableSlots = []
    const currentTime = new Date(startOfDay)

    while (currentTime < endOfDay) {
      const isBooked = existingConsultations.some(consultation => {
        const consultationEnd = new Date(
          consultation.scheduledDate.getTime() + (consultation.duration || 60) * 60 * 1000
        )
        return currentTime >= consultation.scheduledDate && currentTime < consultationEnd
      })

      if (!isBooked) {
        availableSlots.push(new Date(currentTime))
      }

      currentTime.setMinutes(currentTime.getMinutes() + 30)
    }

    return availableSlots
  }
}
