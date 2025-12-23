import { prisma } from './prisma'
import type { Prisma, PrescriptionStatus } from '@prisma/client'

export interface PrescriptionFilters {
  search?: string
  status?: string
  patientId?: string
  doctorId?: string
}

export interface MedicationItem {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface PrescriptionCreateData {
  patientId: string
  doctorId: string
  medications: MedicationItem[]
  notes?: string
  status?: string
  consultationId?: string
}

export class PrescriptionsServiceDb {
  static toApiShape(db: {
    id: string
    patientId: string
    doctorId: string
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string | null
    notes?: string | null
    status: string
    startDate: Date | null
    endDate: Date | null
    createdAt: Date
    updatedAt: Date
    digitalSignature?: string | null
    patient?: { id: string; name: string; email: string | null; phone: string | null } | null
    doctor?: { id: string; name: string; email: string; speciality: string | null } | null
  }) {
    const meds = [
      {
        name: db.medication,
        dosage: db.dosage,
        frequency: db.frequency,
        duration: db.duration,
        instructions: db.instructions || undefined,
      },
    ]
    return {
      id: db.id,
      patientId: db.patientId,
      doctorId: db.doctorId,
      medications: meds,
      notes: db.notes || undefined,
      status: db.status,
      startDate: db.startDate,
      endDate: db.endDate,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
      patient: db.patient ? { id: db.patient.id, name: db.patient.name, email: db.patient.email, phone: db.patient.phone } : undefined,
      doctor: db.doctor ? { id: db.doctor.id, name: db.doctor.name, email: db.doctor.email, speciality: db.doctor.speciality } : undefined,
      digitalSignature: db.digitalSignature || null,
    }
  }

  static fromApiToDb(input: { medications: MedicationItem[] }) {
    const first = input.medications && input.medications[0]
    if (!first) throw new Error('Pelo menos um medicamento é obrigatório')
    return {
      medication: first.name,
      dosage: first.dosage,
      frequency: first.frequency,
      duration: first.duration,
      instructions: first.instructions || null,
    }
  }

  static async list(filters: PrescriptionFilters = {}, page = 1, limit = 10) {
    const where: Prisma.PrescriptionWhereInput = {}
    // status is passed as a string; cast it to the appropriate Prisma enum type
    if (filters.status) where.status = filters.status as PrescriptionStatus
    if (filters.patientId) where.patientId = filters.patientId
    if (filters.doctorId) where.doctorId = filters.doctorId
    if (filters.search) {
      where.OR = [
        { patient: { name: { contains: filters.search, mode: 'insensitive' } } },
        { medication: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    try {
      const [rows, total] = await Promise.all([
        prisma.prescription.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, email: true, phone: true } },
            doctor: { select: { id: true, name: true, email: true, speciality: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.prescription.count({ where }),
      ])

      return {
        prescriptions: rows.map(this.toApiShape),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string; meta?: unknown }
      console.error('Prisma error in PrescriptionsServiceDb.list', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }

  static async getById(id: string) {
    try {
      const row = await prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
          doctor: { select: { id: true, name: true, email: true, speciality: true } },
        },
      })
      return row ? this.toApiShape(row) : null
    } catch (err: unknown) {
      const error = err as Error & { code?: string; meta?: unknown }
      console.error('Prisma error in PrescriptionsServiceDb.getById', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }

  static async getPrescriptionById(id: string) {
    try {
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
          doctor: { select: { id: true, name: true, email: true, speciality: true } },
        },
      })
      if (!prescription) return null
      return this.toApiShape(prescription)
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Prisma error in PrescriptionsServiceDb.getPrescriptionById', {
        message: error?.message,
        code: error?.code,
      })
      throw err
    }
  }

  static async create(data: PrescriptionCreateData) {
    try {
      const doctorId = data.doctorId

      const med = this.fromApiToDb({ medications: data.medications })
      const created = await prisma.prescription.create({
        data: {
          patientId: data.patientId,
          doctorId: doctorId,
            consultationId: data.consultationId || null,
          status: (data.status || 'ACTIVE') as PrescriptionStatus,
          ...med,
        },
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
          doctor: { select: { id: true, name: true, email: true, speciality: true } },
        },
      })
      return this.toApiShape(created)
    } catch (err: unknown) {
      const error = err as Error & { code?: string; meta?: unknown }
      console.error('Prisma error in PrescriptionsServiceDb.create', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }



  static async update(id: string, payload: Partial<PrescriptionCreateData>) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, unknown> = {}
      if (payload.medications && payload.medications.length > 0) {
        Object.assign(data, this.fromApiToDb({ medications: payload.medications }))
      }
      if (payload.status) data.status = payload.status
      if (payload.consultationId !== undefined) data.consultationId = payload.consultationId

      const updated = await prisma.prescription.update({
        where: { id },
        data,
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
          doctor: { select: { id: true, name: true, email: true, speciality: true } },
        },
      })
      return this.toApiShape(updated)
    } catch (err: unknown) {
      const error = err as Error & { code?: string; meta?: unknown }
      console.error('Prisma error in PrescriptionsServiceDb.update', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }

  static async remove(id: string) {
    try {
      await prisma.prescription.delete({ where: { id } })
      return { success: true }
    } catch (err: unknown) {
      const error = err as Error & { code?: string; meta?: unknown }
      console.error('Prisma error in PrescriptionsServiceDb.remove', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }
}
