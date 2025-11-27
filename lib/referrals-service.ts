import { prisma } from '@/lib/prisma'

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
  static async createReferral(data: ReferralCreateData) {
    return prisma.referral.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        specialty: data.specialty,
        description: data.description,
        priority: data.priority,
        notes: data.notes,
        status: 'PENDING'
      },
      include: {
        patient: true,
        doctor: true
      }
    })
  }

  static async getReferrals(
    filters: ReferralFilters = {},
    page = 1,
    limit = 10
  ) {
    try {
      const { search, patientId, doctorId, status, specialty, dateFrom, dateTo } = filters
    const where: any = {}

      if (patientId) where.patientId = patientId
      if (doctorId) where.doctorId = doctorId
      if (status) where.status = status
      if (specialty) where.specialty = specialty
      
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { specialty: { contains: search, mode: 'insensitive' } },
          { patient: { name: { contains: search, mode: 'insensitive' } } }
        ]
      }

      const [total, referrals] = await Promise.all([
        prisma.referral.count({ where }),
        prisma.referral.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: true,
            doctor: true
          }
        })
      ])

      return { total, referrals }
    } catch (error) {
      console.error('[ReferralsService] Error fetching referrals:', error)
      throw error
    }
  }
}
