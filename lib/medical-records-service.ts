import { prisma } from '@/lib/prisma'
import { Prisma, RecordType } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface MedicalRecordFilters {
  search?: string
  type?: string
  patientId?: string
  doctorId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface MedicalRecordCreateData {
  patientId: string
  doctorId: string
  title: string
  description: string
  diagnosis?: string
  treatment?: string
  recordType: RecordType | string
  priority: string
  notes?: string
}

export interface MedicalRecordUpdateData {
  title?: string
  description?: string
  diagnosis?: string
  treatment?: string
  recordType?: RecordType | string
  priority?: string
  notes?: string
}

export class MedicalRecordsService {
  /**
   * Buscar prontuários com filtros e paginação
   */
  static async getMedicalRecords(
    filters: MedicalRecordFilters = {},
    page = 1,
    limit = 10
  ) {
    try {
      const { search, type, patientId, doctorId, dateFrom, dateTo } = filters;
      const where: Prisma.MedicalRecordWhereInput = {};

      if (patientId) where.patientId = patientId;
      if (doctorId) where.doctorId = doctorId;

      if (type && type !== 'ALL') {
        where.recordType = type as RecordType;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { diagnosis: { contains: search, mode: 'insensitive' } },
          { treatment: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Soft delete check
      where.deletedAt = null;

      const [total, medicalRecords] = await Promise.all([
        prisma.medicalRecord.count({ where }),
        prisma.medicalRecord.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
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
            },
          },
        })
      ]);

      return {
        records: medicalRecords,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error({ error }, '[MedicalRecordsService] Error fetching medical records')
      throw error
    }
  }

  /**
   * Criar novo prontuário
   */
  static async createMedicalRecord(data: MedicalRecordCreateData) {
    try {
      const { signCertificate } = await import('@/lib/signature-service')

      return await prisma.$transaction(async (tx) => {
        // 1. Criar o Prontuário
        const record = await tx.medicalRecord.create({
          data: {
            ...data,
            recordType: data.recordType as RecordType,
          },
          include: {
            patient: { select: { id: true, name: true, cpf: true } },
            doctor: { select: { id: true, name: true, crmNumber: true } }
          }
        })

        // 2. Preparar dados para assinatura
        const dataToSign = JSON.stringify({
          recordId: record.id,
          patientId: record.patientId,
          doctorId: record.doctorId,
          title: record.title,
          description: record.description,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          createdAt: record.createdAt.toISOString()
        })

        // 3. Assinar o prontuário
        let signature = null
        let signatureMethod = 'NONE'
        try {
          // Usa PKI_LOCAL como padrão (pode evoluir para ICP_BRASIL)
          const signResult = signCertificate(dataToSign, 'PKI_LOCAL')
          signature = signResult.signature
          signatureMethod = signResult.method
        } catch (error) {
          logger.warn('Falha ao assinar prontuário digitalmente:', error)
        }

        // 4. Salvar Assinatura se tiver sucesso
        if (signature) {
          await tx.medicalRecordSignature.create({
            data: {
              medicalRecordId: record.id,
              signerId: data.doctorId,
              signatureType: signatureMethod,
              signatureHash: signature,
              certificateInfo: { signedBy: 'HealthCare Local', signedAt: new Date().toISOString() }
            }
          })

          // Atualiza status do Prontuário indicando assinatura
          await tx.medicalRecord.update({
            where: { id: record.id },
            data: { signedDocumentId: signatureMethod } // Usando isso temporariamente para mostrar UI
          })
        }

        return record
      })

    } catch (error) {
      logger.error({ error }, '[MedicalRecordsService] Error creating medical record')
      throw error
    }
  }

  /**
   * Buscar prontuário por ID
   */
  static async getMedicalRecordById(id: string) {
    try {
      return await prisma.medicalRecord.findFirst({
        where: {
          id,
          deletedAt: null
        },
        include: {
          patient: true,
          doctor: true,
          attachments: true,
          aiAnalysis: true,
          signatures: true
        }
      });
    } catch (error) {
      logger.error({ error }, '[MedicalRecordsService] Error fetching medical record by ID')
      throw error
    }
  }

  /**
   * Atualizar prontuário
   */
  static async updateMedicalRecord(id: string, data: MedicalRecordUpdateData) {
    try {
      const { recordType, ...rest } = data
      const updateData: Prisma.MedicalRecordUpdateInput = {
        ...rest,
        version: { increment: 1 }, // Optimistic locking support
      }
      if (recordType) {
        updateData.recordType = recordType as RecordType
      }
      return await prisma.medicalRecord.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error({ error }, '[MedicalRecordsService] Error updating medical record')
      throw error
    }
  }

  /**
   * Deletar prontuário (Soft Delete)
   */
  static async deleteMedicalRecord(id: string) {
    try {
      return await prisma.medicalRecord.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
    } catch (error) {
      logger.error({ error }, '[MedicalRecordsService] Error deleting medical record')
      throw error
    }
  }
}