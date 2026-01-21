/**
 * External System Integration Services
 * Integrates with Cartórios, SUS, and Government APIs
 */

import { prisma } from './prisma'
import { signCertificate } from './signature-service'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

/**
 * Cartório Integration - Digital Filing Service
 * Submits digitally signed certificates to notary registries
 */
export const CartorioService = {
  /**
   * Submit certificate to Cartório for digital filing
   * Prepares signed PDF and metadata according to Cartório standards
   */
  async submitCertificate(
    certificateId: string,
    cartorioId: string,
    registrationType: 'REGISTRATION' | 'FILING' | 'CERTIFICATION'
  ): Promise<{
    success: boolean
    protocolNumber?: string
    error?: string
    timestamp: Date
  }> {
    try {
      const certificate = await prisma.medicalCertificate.findUnique({
        where: { id: certificateId },
        include: {
          patient: { select: { name: true, cpf: true, email: true } },
          doctor: { select: { name: true } }
        }
      })

      if (!certificate) {
        return {
          success: false,
          error: 'Atestado não encontrado',
          timestamp: new Date()
        }
      }

      if (certificate.revokedAt) {
        return {
          success: false,
          error: 'Atestado revogado não pode ser enviado ao cartório',
          timestamp: new Date()
        }
      }

      // Prepare Cartório submission payload
      const payload = {
        // Cartório metadata
        cartorioId,
        registrationType,
        submissionDate: new Date(),

        // Certificate data
        certificateNumber: `${certificate.sequenceNumber}/${certificate.year}`,
        certificateType: certificate.type,
        content: certificate.content,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        days: certificate.days,

        // Parties involved
        patient: {
          name: certificate.patient.name,
          cpf: certificate.patient.cpf || 'N/A',
          email: certificate.patient.email
        },
        doctor: {
          name: certificate.doctor.name,
          cpf: await extractDoctorCPF(certificateId)
        },

        // Signature verification
        signature: certificate.signature,
        signatureMethod: certificate.signatureMethod,
        qrCodeData: certificate.qrCodeData,

        // Audit trail
        issuedAt: certificate.createdAt,
        signedBy: certificate.doctorId,
        signatureTimestamp: new Date() // Time of Cartório submission
      }

      // Log submission attempt
      await prisma.integrationLog.create({
        data: {
          integrationName: 'CARTORIO',
          certificateId,
          status: 'SUBMITTED',
          requestPayload: JSON.stringify(payload),
          responseData: JSON.stringify({
            message: 'Cartório submission prepared for external API',
            cartorioId,
            registrationType
          })
        }
      })

      // Generate mock protocol number (in production, this would come from Cartório API response)
      const protocolNumber = `CART-${certificateId.slice(0, 8).toUpperCase()}-${Date.now()}`

      // TODO: Integrate with actual Cartório API
      // Steps:
      // 1. Connect to Cartório SOAP/REST endpoint
      // 2. Send payload with signed certificate
      // 3. Receive protocol number and timestamp
      // 4. Store protocol in database
      // 5. Handle Cartório-specific error responses

      logger.info('[Cartório Integration] Submission prepared:', {
        cartorioId,
        certificateId,
        protocolNumber,
        registrationType
      })

      return {
        success: true,
        protocolNumber,
        timestamp: new Date()
      }
    } catch (error) {
      logger.error('[Cartório Error]', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      }
    }
  },

  /**
   * Check submission status with Cartório
   */
  async checkSubmissionStatus(
    protocolNumber: string,
    cartorioId: string
  ): Promise<{
    status: 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED'
    details?: string
    error?: string
  }> {
    try {
      // TODO: Query Cartório API for protocol status
      // This would typically involve:
      // 1. Send SOAP/REST request with protocolNumber
      // 2. Parse Cartório response
      // 3. Map status codes to our enum
      // 4. Return with any details/messages

      logger.info('[Cartório] Checking status:', protocolNumber)
      return {
        status: 'PROCESSING',
        details: 'Consulta em progresso no cartório'
      }
    } catch (error) {
      return {
        status: 'SUBMITTED',
        error: error instanceof Error ? error.message : 'Erro ao verificar status'
      }
    }
  }
}

/**
 * SUS Integration - Brazilian Health System
 * Links medical certificates with SUS registry
 */
export const SUSService = {
  /**
   * Register certificate with SUS medical records
   * Links certificate to patient's SUS registry
   */
  async registerMedicalRecord(
    certificateId: string,
    susRegistration: string // Patient's SUS number
  ): Promise<{
    success: boolean
    susRecordId?: string
    error?: string
    timestamp: Date
  }> {
    try {
      const certificate = await prisma.medicalCertificate.findUnique({
        where: { id: certificateId },
        include: {
          patient: { select: { name: true, cpf: true } },
          doctor: { select: { name: true } }
        }
      })

      if (!certificate) {
        return {
          success: false,
          error: 'Atestado não encontrado',
          timestamp: new Date()
        }
      }

      // Prepare SUS submission payload
      const payload = {
        // SUS identifiers
        susNumber: susRegistration,
        cpf: certificate.patient.cpf || 'N/A',

        // Certificate details
        certificateType: certificate.type,
        certificateContent: certificate.content,
        certificateNumber: `${certificate.sequenceNumber}/${certificate.year}`,
        issueDate: certificate.createdAt,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        days: certificate.days,

        // Health information
        healthStatus: extractHealthStatus(certificate.content),
        procedures: extractProcedures(certificate.content),
        medications: extractMedications(certificate.content),

        // Medical professional info
        doctor: {
          name: certificate.doctor.name,
          cpf: await extractDoctorCPF(certificateId)
        },
        facility: {
          cnes: await extractCNES(certificateId)
        },

        // Digital proof
        signature: certificate.signature,
        qrCodeData: certificate.qrCodeData,
        submissionTimestamp: new Date()
      }

      // Log submission
      await prisma.integrationLog.create({
        data: {
          integrationName: 'SUS',
          certificateId,
          status: 'SUBMITTED',
          requestPayload: JSON.stringify(payload),
          responseData: JSON.stringify({
            message: 'SUS registration prepared for external API',
            susNumber: susRegistration
          })
        }
      })

      // Generate mock SUS record ID
      const susRecordId = `SUS-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      // TODO: Integrate with actual SUS API
      // Steps:
      // 1. Connect to SUS DATASUS endpoint
      // 2. Authenticate with clinic credentials
      // 3. Send certificate data in SUS format (HL7 or similar)
      // 4. Receive SUS record ID
      // 5. Handle SUS-specific error responses (invalid CPF, SUS number, etc.)

      logger.info('[SUS Integration] Medical record registration prepared:', {
        susRegistration,
        certificateId,
        susRecordId
      })

      return {
        success: true,
        susRecordId,
        timestamp: new Date()
      }
    } catch (error) {
      logger.error('[SUS Error]', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      }
    }
  },

  /**
   * Query SUS registry for patient medical history
   */
  async getPatientHistory(
    cpf: string,
    susNumber: string
  ): Promise<{
    found: boolean
    history?: Array<{
      date: Date
      description: string
      provider: string
    }>
    error?: string
  }> {
    try {
      // TODO: Query DATASUS for patient medical history
      // This would involve:
      // 1. Authenticate with clinic credentials
      // 2. Send CPF and SUS number
      // 3. Parse SUS response with historical data
      // 4. Format and return

      logger.info('[SUS] Querying history for:', cpf)
      return {
        found: false,
        error: 'SUS API integration not yet configured'
      }
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar histórico'
      }
    }
  }
}

/**
 * Government Protocol Integration
 * Submits official certificates to government offices
 */
export const GovernmentProtocolService = {
  /**
   * Submit certificate to government protocol system
   * For official licensing, permits, and legal proceedings
   */
  async submitProtocol(
    certificateId: string,
    protocolType:
      | 'LABOR_PERMISSION'
      | 'LEGAL_PROCEEDING'
      | 'SOCIAL_BENEFIT'
      | 'OFFICIAL_RECORD'
  ): Promise<{
    success: boolean
    governmentProtocolId?: string
    error?: string
    timestamp: Date
  }> {
    try {
      const certificate = await prisma.medicalCertificate.findUnique({
        where: { id: certificateId },
        include: {
          patient: { select: { name: true, cpf: true } },
          doctor: { select: { name: true } }
        }
      })

      if (!certificate) {
        return {
          success: false,
          error: 'Atestado não encontrado',
          timestamp: new Date()
        }
      }

      if (certificate.revokedAt) {
        return {
          success: false,
          error: 'Atestado revogado não pode ser enviado para protocolamento',
          timestamp: new Date()
        }
      }

      // Prepare government submission payload
      const payload = {
        // Government metadata
        protocolType,
        submissionDate: new Date(),

        // Certificate full data
        certificate: {
          number: `${certificate.sequenceNumber}/${certificate.year}`,
          type: certificate.type,
          content: certificate.content,
          startDate: certificate.startDate,
          endDate: certificate.endDate,
          days: certificate.days,
          issued: certificate.createdAt
        },

        // Subject
        subject: {
          name: certificate.patient.name,
          cpf: certificate.patient.cpf || 'N/A'
        },

        // Responsible professional
        issuedBy: {
          name: certificate.doctor.name,
          cpf: await extractDoctorCPF(certificateId)
        },

        // Digital signature (REQUIRED for government protocols)
        digitalSignature: {
          value: certificate.signature,
          method: certificate.signatureMethod,
          algorithm: 'RSA-2048-SHA256'
        },

        // QR Code for validation
        qrCode: certificate.qrCodeData,

        // Protocol-specific requirements
        requiresNotarization:
          protocolType === 'LEGAL_PROCEEDING' ||
          protocolType === 'OFFICIAL_RECORD',
        requiresAuthentication: true
      }

      // Log submission
      await prisma.integrationLog.create({
        data: {
          integrationName: 'GOVERNMENT_PROTOCOL',
          certificateId,
          status: 'SUBMITTED',
          requestPayload: JSON.stringify(payload),
          responseData: JSON.stringify({
            message: 'Government protocol submission prepared',
            protocolType
          })
        }
      })

      // Generate government protocol ID
      const governmentProtocolId = `GOV-${Date.now()}-${protocolType.slice(0, 3)}`

      // TODO: Integrate with actual government protocol system
      // Steps:
      // 1. Connect to government portal/API
      // 2. Authenticate with certificate's digital signature
      // 3. Send complete payload with digital proof
      // 4. Receive official protocol ID and timestamp
      // 5. Handle government-specific error responses

      logger.info('[Government Protocol] Submission prepared:', {
        protocolType,
        certificateId,
        governmentProtocolId
      })

      return {
        success: true,
        governmentProtocolId,
        timestamp: new Date()
      }
    } catch (error) {
      logger.error('[Government Protocol Error]', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      }
    }
  },

  /**
   * Verify government protocol submission
   */
  async verifyProtocol(
    governmentProtocolId: string
  ): Promise<{
    verified: boolean
    status?: string
    details?: Record<string, any>
    error?: string
  }> {
    try {
      // TODO: Query government system for protocol verification
      logger.info('[Government] Verifying protocol:', governmentProtocolId)
      return {
        verified: false,
        error: 'Government API integration not yet configured'
      }
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar protocolo'
      }
    }
  }
}

/**
 * Helper functions for data extraction and formatting
 */

function extractHealthStatus(content: string): string | null {
  // Extract health status keywords from certificate content
  const patterns = [
    /apt[a-z\s]*:/i,
    /inapto[a-z\s]*:/i,
    /health status[:\s]*/i
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].toLowerCase()
    }
  }
  return null
}

function extractProcedures(content: string): string[] {
  // Extract medical procedures mentioned in certificate
  const procedures: string[] = []
  const procedurePatterns = [
    /cirurg[ia]*/gi,
    /tratament[o]*/gi,
    /procediment[o]*/gi,
    /exame[s]*/gi,
    /consulta[s]*/gi
  ]

  for (const pattern of procedurePatterns) {
    const matches = content.match(pattern)
    if (matches) {
      procedures.push(...matches.map((m) => m.toLowerCase()))
    }
  }
  return [...new Set(procedures)]
}

function extractMedications(content: string): string[] {
  // Extract medication names from certificate
  const medications: string[] = []
  // This is a simplified version; real implementation would use medical terminology database
  const medicationPatterns =
    /(?:medicament|remédio|droga)[:\s]*([^\n.]+)/gi

  let match
  while ((match = medicationPatterns.exec(content)) !== null) {
    medications.push(match[1].trim())
  }
  return medications
}

async function extractDoctorCPF(certificateId: string): Promise<string> {
  try {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: {
        doctor: {
          select: {
            person: {
              select: { cpf: true }
            }
          }
        }
      }
    })
    
    return certificate?.doctor?.person?.cpf || 'XXX.XXX.XXX-XX'
  } catch (error) {
    logger.error('[Integration] Error fetching doctor CPF:', error)
    return 'XXX.XXX.XXX-XX'
  }
}

async function extractCNES(certificateId: string): Promise<string> {
  try {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: {
        doctor: {
          select: {
            // Assumindo que existe relacionamento clinic no modelo User/Doctor
            // Se não existir, retorna valor padrão
            id: true
          }
        }
      }
    })
    
    // CNES = Cadastro Nacional de Estabelecimentos de Saúde
    // TODO: Adicionar campo 'cnes' na tabela Clinic quando disponível
    // Por enquanto, retorna placeholder
    return 'XXXXXX'
  } catch (error) {
    logger.error('[Integration] Error fetching CNES:', error)
    return 'XXXXXX'
  }
}

/**
 * Integration Log Model Interface
 * For tracking all external system submissions
 */
export interface IntegrationLogEntry {
  id: string
  integrationName: string
  certificateId: string
  status: 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'ERROR'
  requestPayload: string
  responseData: string
  createdAt: Date
  updatedAt: Date
}
