/**
 * Patient-related types
 */

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type Gender = 'M' | 'F' | 'OTHER'
export type CivilStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED'
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED' | 'STABLE_UNION'

export interface PatientProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  cpf?: string
  rg?: string
  passportNumber?: string
  bloodType?: BloodType
  gender?: Gender
  maritalStatus?: MaritalStatus
  email?: string
  phone?: string
  cellPhone?: string
  motherName?: string
  nationality?: string
  naturalness?: string
  profession?: string
  educationLevel?: string
  allergies?: string[]
  chronicDiseases?: string[]
  surgeries?: string[]
  medications?: string[]
  medicalHistory?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  address?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface PatientCreateData {
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender?: Gender
  cpf?: string
  email?: string
  phone?: string
  cellPhone?: string
  bloodType?: BloodType
  allergies?: string[]
  chronicDiseases?: string[]
}

export interface PatientUpdateData {
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  bloodType?: BloodType
  allergies?: string[]
  chronicDiseases?: string[]
  medicalHistory?: string
  phone?: string
  cellPhone?: string
  email?: string
}
