/**
 * Consultation-related types
 */

export type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type ConsultationType = 'IN_PERSON' | 'TELEMEDICINE' | 'PHONE'

export interface Consultation {
  id: string
  patientId: string
  doctorId: string
  type: ConsultationType
  status: ConsultationStatus
  scheduledAt: Date
  startedAt?: Date
  endedAt?: Date
  reason?: string
  notes?: string
  diagnosis?: string
  soapNote?: SoapNote
  attachments: ConsultationAttachment[]
  createdAt: Date
  updatedAt: Date
}

export interface SoapNote {
  id: string
  consultationId: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  createdAt: Date
  updatedAt: Date
}

export interface ConsultationAttachment {
  id: string
  consultationId: string
  fileName: string
  fileUrl: string
  mimeType: string
  size: number
  uploadedAt: Date
}

export interface ConsultationStats {
  totalConsultations: number
  completedConsultations: number
  cancelledConsultations: number
  averageDuration: number
  patientSatisfaction?: number
}
