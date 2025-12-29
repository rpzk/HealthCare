/**
 * Medical Certificate Service
 * 
 * Gerencia emissão, numeração sequencial, geração de PDF e validação
 * de atestados médicos com conformidade CFM e LGPD.
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { signCertificate, SignatureMethod } from './signature-service'
import { sendCertificateIssuedNotification, sendCertificateRevokedNotification } from './email-service'

const prisma = new PrismaClient()

export interface CertificateData {
  patientId: string
  doctorId: string
  consultationId?: string
  type: 'MEDICAL_LEAVE' | 'FITNESS' | 'ACCOMPANIMENT' | 'TIME_OFF' | 'CUSTOM'
  days?: number
  startDate: Date
  includeCid?: boolean
  cidCode?: string
  cidDescription?: string
  content: string
  observations?: string
  title?: string
}

export class MedicalCertificateService {
  /**
   * Gera próximo número sequencial do ano
   */
  private static async getNextSequenceNumber(): Promise<{ number: number; year: number }> {
    const currentYear = new Date().getFullYear()

    // Buscar último atestado do ano
    const lastCertificate = await prisma.medicalCertificate.findFirst({
      where: { year: currentYear },
      orderBy: { sequenceNumber: 'desc' }
    })

    const nextNumber = lastCertificate ? lastCertificate.sequenceNumber + 1 : 1

    return { number: nextNumber, year: currentYear }
  }

  /**
   * Calcula data final baseada em dias de afastamento
   */
  private static calculateEndDate(startDate: Date, days?: number): Date | null {
    if (!days) return null

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days - 1) // -1 porque o primeiro dia já conta
    return endDate
  }

  /**
   * Gera dados do QR Code para validação
   */
  private static generateQRCodeData(
    sequenceNumber: number,
    year: number,
    patientCpf: string,
    doctorCrm: string
  ): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const hash = crypto
      .createHash('sha256')
      .update(`${sequenceNumber}-${year}-${patientCpf}-${doctorCrm}`)
      .digest('hex')
      .substring(0, 16)

    return `${baseUrl}/validate/certificate/${sequenceNumber}/${year}?h=${hash}`
  }

  /**
   * Emite novo atestado médico
   */
  static async issueCertificate(data: CertificateData) {
    // Validar dados
    if (!data.patientId || !data.doctorId) {
      throw new Error('Paciente e médico são obrigatórios')
    }

    if (data.type === 'MEDICAL_LEAVE' && !data.days) {
      throw new Error('Atestado de afastamento requer número de dias')
    }

    // Buscar dados do paciente e médico
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, name: true, cpf: true }
    })

    const doctor = await prisma.user.findUnique({
      where: { id: data.doctorId },
      select: { id: true, name: true, crmNumber: true, speciality: true }
    })

    if (!patient || !doctor) {
      throw new Error('Paciente ou médico não encontrado')
    }

    // Gerar número sequencial
    const { number: sequenceNumber, year } = await this.getNextSequenceNumber()

    // Calcular data final
    const endDate = this.calculateEndDate(data.startDate, data.days)

    // Gerar QR Code
    const qrCodeData = this.generateQRCodeData(
      sequenceNumber,
      year,
      patient.cpf || '',
      doctor.crmNumber || ''
    )

    // Prepare data for signing (hash of certificate content)
    const certificateDataToSign = JSON.stringify({
      sequenceNumber,
      year,
      patientId: data.patientId,
      doctorId: data.doctorId,
      type: data.type,
      startDate: data.startDate.toISOString(),
      endDate: endDate?.toISOString() || null,
      content: data.content
    })

    // Sign with PKI_LOCAL by default
    const signatureMethod: SignatureMethod = 'PKI_LOCAL'
    let signature: string | null = null
    try {
      const signResult = signCertificate(certificateDataToSign, signatureMethod)
      signature = signResult.signature
    } catch (error) {
      console.warn('Failed to sign certificate:', error)
      // Continue without signature if signing fails
    }

    // Criar atestado
    const certificate = await prisma.medicalCertificate.create({
      data: {
        sequenceNumber,
        year,
        patientId: data.patientId,
        doctorId: data.doctorId,
        consultationId: data.consultationId,
        type: data.type,
        days: data.days,
        startDate: data.startDate,
        endDate,
        includeCid: data.includeCid || false,
        cidCode: data.cidCode,
        cidDescription: data.cidDescription,
        title: data.title || 'ATESTADO MÉDICO',
        content: data.content,
        observations: data.observations,
        qrCodeData,
        signature,
        signatureMethod: signature ? signatureMethod : 'NONE'
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true,
            birthDate: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            crmNumber: true,
            speciality: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: data.doctorId,
        userEmail: '',
        userRole: 'DOCTOR',
        action: 'CERTIFICATE_ISSUED',
        resourceType: 'MedicalCertificate',
        resourceId: certificate.id,
        metadata: {
          sequenceNumber,
          year,
          type: data.type,
          patientId: data.patientId
        }
      }
    })

    // Send email notification to patient
    if (patient && patient.cpf) {
      const validationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/certificates/validate/${sequenceNumber}/${year}`
      
      await sendCertificateIssuedNotification(
        patient.cpf, // Using CPF as placeholder for email - should use patient.email when available
        patient.name,
        doctor.name,
        String(sequenceNumber),
        year,
        data.type,
        format(data.startDate, 'dd/MM/yyyy', { locale: ptBR }),
        endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : undefined,
        validationUrl
      ).catch(err => {
        console.warn('Failed to send certificate issued email:', err)
        // Non-blocking: continue even if email fails
      })
    }

    return certificate
  }

  /**
   * Gera conteúdo padrão baseado no tipo
   */
  static generateDefaultContent(
    type: string,
    patientName: string,
    days?: number,
    observations?: string
  ): string {
    const patientFirstName = patientName.split(' ')[0]

    switch (type) {
      case 'MEDICAL_LEAVE':
        return `Atesto para os devidos fins que ${patientName} necessita de afastamento de suas atividades por motivo de saúde, pelo período de ${days} ${days === 1 ? 'dia' : 'dias'}.${observations ? `\n\n${observations}` : ''}`

      case 'FITNESS':
        return `Atesto para os devidos fins que ${patientName} encontra-se APTO(A) para a prática de atividades físicas.${observations ? `\n\n${observations}` : ''}`

      case 'ACCOMPANIMENT':
        return `Atesto para os devidos fins que ${patientName} necessita de acompanhante para ${observations || 'consulta médica'}.`

      case 'TIME_OFF':
        return `Atesto que ${patientName} compareceu a consulta médica nesta data.${observations ? `\n\n${observations}` : ''}`

      case 'CUSTOM':
        return observations || 'Atesto para os devidos fins.'

      default:
        return `Atesto que ${patientName} esteve em consulta médica.`
    }
  }

  /**
   * Revoga atestado
   */
  static async revokeCertificate(
    certificateId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: {
        patient: {
          select: { name: true, cpf: true, email: true }
        },
        doctor: {
          select: { name: true }
        }
      }
    })

    if (!certificate) {
      throw new Error('Atestado não encontrado')
    }

    // Apenas o médico emissor pode revogar
    if (certificate.doctorId !== userId) {
      throw new Error('Apenas o médico emissor pode revogar o atestado')
    }

    await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: '',
        userRole: 'DOCTOR',
        action: 'CERTIFICATE_REVOKED',
        resourceType: 'MedicalCertificate',
        resourceId: certificateId,
        metadata: { reason }
      }
    })

    // Envia notificação de revogação (não-bloqueante)
    const patientEmail = certificate.patient.email || certificate.patient.cpf
    if (patientEmail) {
      const certificateNumber = `${String(certificate.sequenceNumber).padStart(3, '0')}/${certificate.year}`
      sendCertificateRevokedNotification(
        patientEmail,
        certificate.patient.name,
        certificateNumber,
        reason
      ).catch((error) => {
        console.warn(
          `[Email Error] Falha ao enviar notificação de revogação para ${certificateId}:`,
          error.message
        )
      })
    }
  }

  /**
   * Valida autenticidade do atestado via QR Code
   */
  static async validateCertificate(
    sequenceNumber: number,
    year: number,
    hash: string
  ): Promise<{ valid: boolean; certificate?: any }> {
    const certificate = await prisma.medicalCertificate.findFirst({
      where: {
        sequenceNumber,
        year
      },
      include: {
        patient: {
          select: {
            name: true,
            cpf: true
          }
        },
        doctor: {
          select: {
            name: true,
            crmNumber: true,
            speciality: true
          }
        }
      }
    })

    if (!certificate) {
      return { valid: false }
    }

    // Verificar hash
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${sequenceNumber}-${year}-${certificate.patient.cpf}-${certificate.doctor.crmNumber}`)
      .digest('hex')
      .substring(0, 16)

    if (hash !== expectedHash) {
      return { valid: false }
    }

    // Verificar se não foi revogado
    if (certificate.revokedAt) {
      return { valid: false, certificate: { ...certificate, revoked: true } }
    }

    return { valid: true, certificate }
  }

  /**
   * Lista atestados do paciente
   */
  static async getPatientCertificates(patientId: string) {
    return await prisma.medicalCertificate.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            crmNumber: true,
            speciality: true
          }
        },
        consultation: {
          select: {
            id: true,
            scheduledDate: true
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    })
  }

  /**
   * Lista atestados emitidos pelo médico
   */
  static async getDoctorCertificates(doctorId: string, limit: number = 50) {
    return await prisma.medicalCertificate.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true
          }
        }
      },
      orderBy: { issuedAt: 'desc' },
      take: limit
    })
  }

  /**
   * Formata atestado para exibição
   */
  static formatCertificate(certificate: any): string {
    const header = `${certificate.title}\nNº ${certificate.sequenceNumber.toString().padStart(6, '0')}/${certificate.year}\n\n`
    
    const body = certificate.content + '\n'
    
    let footer = `\n\n${format(certificate.issuedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n\n`
    footer += `${certificate.doctor.name}\n`
    footer += `CRM: ${certificate.doctor.crmNumber}\n`
    
    if (certificate.doctor.speciality) {
      footer += `${certificate.doctor.speciality}\n`
    }

    return header + body + footer
  }

  /**
   * Estatísticas de atestados (para BI)
   */
  static async getCertificateStats(doctorId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {}
    
    if (doctorId) {
      where.doctorId = doctorId
    }

    if (startDate || endDate) {
      where.issuedAt = {}
      if (startDate) where.issuedAt.gte = startDate
      if (endDate) where.issuedAt.lte = endDate
    }

    const [total, byType, avgDays] = await Promise.all([
      // Total de atestados
      prisma.medicalCertificate.count({ where }),

      // Por tipo
      prisma.medicalCertificate.groupBy({
        by: ['type'],
        where,
        _count: true
      }),

      // Média de dias de afastamento
      prisma.medicalCertificate.aggregate({
        where: {
          ...where,
          type: 'MEDICAL_LEAVE',
          days: { not: null }
        },
        _avg: { days: true }
      })
    ])

    return {
      total,
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      averageLeaveDays: avgDays._avg.days || 0
    }
  }
}
