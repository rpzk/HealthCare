import { prisma } from './prisma'

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
  static toApiShape(db: any) {
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
      notes: (db as any).notes || undefined,
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
    const where: any = {}
    if (filters.status) where.status = filters.status
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
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.list', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack?.split('\n').slice(0,5).join(' | ')
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
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.getById', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack?.split('\n').slice(0,5).join(' | ')
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
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.getPrescriptionById', {
        message: err?.message,
        code: err?.code,
      })
      throw err
    }
  }

  static async create(data: PrescriptionCreateData) {
    try {
      // Bypass-friendly: ensure doctor exists (or create a minimal stub) if ALLOW_TEST_BYPASS
      let doctorId = data.doctorId
      if (process.env.ALLOW_TEST_BYPASS === 'true') {
        try {
          const existing = await prisma.user.findUnique({ where: { id: data.doctorId } })
          if (!existing) {
            const email = `bypass_doctor_${data.doctorId}@local.test`
            const created = await prisma.user.upsert({
              where: { id: data.doctorId },
              update: {},
              create: {
                id: data.doctorId,
                email,
                name: 'Dr. Bypass',
                role: 'DOCTOR',
              },
            })
            doctorId = created.id
          }
        } catch (inner) {
          console.warn('Bypass doctor ensure failed', inner)
        }
      }

      const med = this.fromApiToDb({ medications: data.medications })
      const created = await prisma.prescription.create({
        data: {
          patientId: data.patientId,
          doctorId: doctorId,
            consultationId: data.consultationId || null,
          status: (data.status as any) || 'ACTIVE',
          ...med,
        },
        include: {
          patient: { select: { id: true, name: true, email: true, phone: true } },
          doctor: { select: { id: true, name: true, email: true, speciality: true } },
        },
      })
      return this.toApiShape(created)
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.create', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }



  static async update(id: string, payload: Partial<PrescriptionCreateData>) {
    try {
      const data: any = {}
      if (payload.medications && payload.medications.length > 0) {
        Object.assign(data, this.fromApiToDb({ medications: payload.medications }))
      }
      if (payload.status) data.status = payload.status as any
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
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.update', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }

  static async remove(id: string) {
    try {
      await prisma.prescription.delete({ where: { id } })
      return { success: true }
    } catch (err: any) {
      console.error('Prisma error in PrescriptionsServiceDb.remove', {
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack?.split('\n').slice(0,5).join(' | ')
      })
      throw err
    }
  }
}
