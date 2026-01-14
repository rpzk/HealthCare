/**
 * Service para gerenciar templates de documentos
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { extractVariables, isValidVariable } from './variables'

export interface CreateTemplateInput {
  name: string
  documentType: string
  description?: string
  htmlTemplate: string
  cssTemplate?: string
  config?: Prisma.JsonValue
  signaturePosition?: string
  signatureSize?: string
  qrcodePosition?: string
  qrcodeSize?: string
  showQrcode?: boolean
  clinicName?: boolean
  clinicLogo?: boolean
  clinicAddress?: boolean
  clinicPhone?: boolean
  doctorName?: boolean
  doctorSpec?: boolean
  doctorCRM?: boolean
  doctorAddress?: boolean
  doctorLogo?: boolean
  showFooter?: boolean
  footerText?: string
  isActive?: boolean
  isDefault?: boolean
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export class DocumentTemplateService {
  /**
   * Criar novo template
   */
  static async createTemplate(input: CreateTemplateInput, userId: string) {
    // Validar variáveis no template
    const extracted = extractVariables(input.htmlTemplate)
    const invalid = extracted.filter((v) => !isValidVariable(v))

    if (invalid.length > 0) {
      throw new Error(
        `Variáveis inválidas encontradas no template: ${invalid.join(', ')}`
      )
    }

    // Se marcar como padrão, desmarcar outros
    if (input.isDefault && input.documentType) {
      await prisma.documentTemplate.updateMany({
        where: {
          documentType: input.documentType,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const createData: any = {
      ...input,
      createdBy: userId,
      isActive: input.isActive ?? true,
      clinicName: input.clinicName ?? true,
      clinicLogo: input.clinicLogo ?? true,
      clinicAddress: input.clinicAddress ?? true,
      clinicPhone: input.clinicPhone ?? true,
      doctorName: input.doctorName ?? true,
      doctorSpec: input.doctorSpec ?? true,
      doctorCRM: input.doctorCRM ?? true,
      doctorAddress: input.doctorAddress ?? false,
      doctorLogo: input.doctorLogo ?? false,
      showFooter: input.showFooter ?? true,
      showQrcode: input.showQrcode ?? true,
    }

    return prisma.documentTemplate.create({
      data: createData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Atualizar template
   */
  static async updateTemplate(input: UpdateTemplateInput, userId: string) {
    const { id, ...data } = input

    // Validar variáveis se HTML foi alterado
    if (data.htmlTemplate) {
      const extracted = extractVariables(data.htmlTemplate)
      const invalid = extracted.filter((v) => !isValidVariable(v))

      if (invalid.length > 0) {
        throw new Error(
          `Variáveis inválidas encontradas no template: ${invalid.join(', ')}`
        )
      }
    }

    // Se marcar como padrão, desmarcar outros
    if (data.isDefault) {
      const template = await prisma.documentTemplate.findUnique({
        where: { id },
      })

      if (template) {
        await prisma.documentTemplate.updateMany({
          where: {
            documentType: template.documentType,
            isDefault: true,
            NOT: {
              id,
            },
          },
          data: {
            isDefault: false,
          },
        })
      }
    }

    const updateData: any = data

    return prisma.documentTemplate.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Obter template por ID
   */
  static async getTemplate(id: string) {
    return prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Listar templates
   */
  static async listTemplates(
    filters?: {
      documentType?: string
      isActive?: boolean
      createdBy?: string
    },
    pagination?: {
      skip?: number
      take?: number
    }
  ) {
    return prisma.documentTemplate.findMany({
      where: {
        ...(filters?.documentType && {
          documentType: filters.documentType,
        }),
        ...(filters?.isActive !== undefined && {
          isActive: filters.isActive,
        }),
        ...(filters?.createdBy && {
          createdBy: filters.createdBy,
        }),
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 10,
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Deletar template
   */
  static async deleteTemplate(id: string) {
    return prisma.documentTemplate.delete({
      where: { id },
    })
  }

  /**
   * Obter template padrão para tipo de documento
   */
  static async getDefaultTemplate(documentType: string) {
    return prisma.documentTemplate.findFirst({
      where: {
        documentType,
        isDefault: true,
        isActive: true,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Obter templates para tipo de documento
   */
  static async getTemplatesForType(documentType: string) {
    return prisma.documentTemplate.findMany({
      where: {
        documentType,
        isActive: true,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        isDefault: 'desc',
        createdAt: 'desc',
      },
    })
  }

  /**
   * Contar templates
   */
  static async countTemplates(filters?: {
    documentType?: string
    isActive?: boolean
  }) {
    return prisma.documentTemplate.count({
      where: {
        ...(filters?.documentType && {
          documentType: filters.documentType,
        }),
        ...(filters?.isActive !== undefined && {
          isActive: filters.isActive,
        }),
      },
    })
  }

  /**
   * Registrar documento gerado
   */
  static async recordGeneratedDocument(data: {
    templateId: string
    documentType: string
    documentId: string
    doctorId: string
    patientId?: string
    pdfUrl?: string
    signedHash?: string
    signedDocumentId?: string
  }) {
    return prisma.generatedDocument.create({
      data,
      include: {
        template: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Obter documentos gerados para template
   */
  static async getGeneratedDocuments(templateId: string, pagination?: {
    skip?: number
    take?: number
  }) {
    return prisma.generatedDocument.findMany({
      where: { templateId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 20,
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Duplicar template
   */
  static async duplicateTemplate(id: string, userId: string) {
    const original = await prisma.documentTemplate.findUnique({
      where: { id },
    })

    if (!original) {
      throw new Error('Template não encontrado')
    }

    const { id: _id, createdAt, updatedAt, ...data } = original

    const createData: any = {
      ...data,
      name: `${original.name} (Cópia)`,
      isDefault: false,
      createdBy: userId,
    }

    return prisma.documentTemplate.create({
      data: createData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }
}
