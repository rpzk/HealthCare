/**
 * Prescription-related types
 */

export type PrescriptionStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED'

export interface Prescription {
  id: string
  patientId: string
  doctorId: string
  issueDate: Date
  expiryDate?: Date
  status: PrescriptionStatus
  medications: PrescriptionMedication[]
  observations?: string
  signature?: {
    certificateId: string
    signedAt: Date
    hash: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface PrescriptionMedication {
  id: string
  prescriptionId: string
  medicationId: string
  medicationName: string
  dosage: string
  frequency: string
  durationDays?: number
  notes?: string
  quantity?: number
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  medicationId: string
  medicationName: string
  dosage: string
  frequency: string
  quantity: number
  unit: string
}

export interface PrescriptionHistory {
  id: string
  patientId: string
  doctorId: string
  issueDate: Date
  medications: string[]
  status: PrescriptionStatus
}
