/**
 * Medication-related types
 */

export type FrequencyUnit = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVERY_OTHER_DAY' | 'CUSTOM'
export type DosageUnit = 'MG' | 'ML' | 'G' | 'UNITS' | 'MCURIE' | 'TABLET' | 'CAPSULE'

export interface Medication {
  id: string
  name: string
  description?: string
  activeIngredient: string
  dosageForm: string
  manufacturer?: string
  barcode?: string
  createdAt: Date
  updatedAt: Date
}

export interface MedicationPrescription {
  id: string
  prescriptionId: string
  medicationId: string
  dosage: number
  dosageUnit: DosageUnit
  frequency: number
  frequencyUnit: FrequencyUnit
  durationDays?: number
  notes?: string
  startDate: Date
  endDate?: Date
}

export interface MedicationTracking {
  id: string
  prescriptionItemId: string
  patientId: string
  takenAt: Date
  dosage: number
  dosageUnit: DosageUnit
  notes?: string
  missed: boolean
  recordedAt: Date
}

export interface MedicationStock {
  id: string
  medicationId: string
  quantity: number
  expiryDate: Date
  locationId: string
  batchNumber?: string
  lastUpdated: Date
}
