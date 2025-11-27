import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Urgency } from '@prisma/client'

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
  // Criar solicitação de exame
  static async createExamRequest(data: ExamRequestCreateData) {
    const mappedUrgency: Urgency = ((): Urgency => {
      const p = (data.priority || '').toUpperCase()
      // Map project-specific priority strings to Prisma Urgency enum
      if (p === 'HIGH' || p === 'URGENT') return 'URGENT'
      if (p === 'EMERGENCY') return 'EMERGENCY'
      return 'ROUTINE'
    })()

    const examRequest = await prisma.examRequest.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        examType: data.examType,
        description: data.description,
        urgency: mappedUrgency,
        notes: data.notes,
        scheduledDate: data.scheduledDate,
        status: 'REQUESTED',
      },
      include: {
        patient: true,
        doctor: true,
      }
    });
    return examRequest;
  }
  // Buscar solicitações de exame com filtros e paginação
  static async getExamRequests(
    filters: ExamRequestFilters = {},
    page = 1,
    limit = 10
  ) {
    try {
      const { search, patientId, doctorId, status, type, dateFrom, dateTo } = filters;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (patientId) where.patientId = patientId;
      if (doctorId) where.doctorId = doctorId;
      if (status) where.status = status;
      if (type) where.examType = type;
      if (dateFrom || dateTo) {
        where.requestDate = {};
        if (dateFrom) where.requestDate.gte = dateFrom;
        if (dateTo) where.requestDate.lte = dateTo;
      }
      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { examType: { contains: search, mode: 'insensitive' } }
        ];
      }
      const [total, examRequests] = await Promise.all([
        prisma.examRequest.count({ where }),
        prisma.examRequest.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { requestDate: 'desc' },
          include: {
            patient: true,
            doctor: true,
            consultation: true,
          },
        })
      ]);
      return { total, examRequests };
    } catch (error) {
      logger.error({ error }, '[ExamRequestsService] Error fetching exam requests')
      throw error
    }
  }
}
