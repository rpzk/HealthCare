/**
 * SSF Service Types and Interfaces
 * Centralized type definitions for all SSF services
 */

import { Country, State, City, Zone, District, Subprefecture, Neighborhood, Area, User, Patient, Household, Address } from '@prisma/client'

// ============================================================================
// GEOGRAPHIC TYPES
// ============================================================================

export interface GeographicEntity {
  id: string
  name: string
  code?: string
  description?: string
}

export interface GeographicLevel {
  country: Country
  state?: State
  city?: City
  zone?: Zone
  district?: District
  subprefecture?: Subprefecture
  neighborhood?: Neighborhood
  area?: Area
}

export interface LocationCoordinates {
  latitude: number
  longitude: number
  altitude?: number
}

// ============================================================================
// ACS TYPES
// ============================================================================

export interface ACSUser extends User {
  role: 'ACS' | 'PSF_COORDINATOR'
  assignedAreaId?: string
  acsAssignedMicroAreaId?: string
  assignedArea?: Area
}

export interface ACSAssignment {
  userId: string
  areaId: string
  microAreaId?: string
  assignedAt: Date
  unassignedAt?: Date
  assignmentReason?: string
  assignedByUserId?: string
}

export interface ACSCoverage {
  areaId: string
  areaName: string
  totalACS: number
  activeACS: number
  averageHouseholdsPerACS: number
  coveragePercentage: number
}

// ============================================================================
// PATIENT PSF TYPES
// ============================================================================

export interface PSFPatient extends Patient {
  familyNumber?: string
  sequenceInFamily?: number
  fatherName?: string
  rg?: string
  rgState?: string
  socialVulnerability?: string
  economicClass?: string
  monthlyFamilyIncome?: number
  preferredAddressId?: string
  preferredAddress?: Address
}

export interface FamilyGroup {
  familyNumber: string
  areaId: string
  economicClass?: string
  monthlyIncome?: number
  householdId?: string
  members: PSFPatient[]
}

export interface SocialClass {
  code: 'A' | 'B' | 'C' | 'D' | 'E'
  label: string
  monthlyIncomeRange: { min: number; max: number }
}

export const SOCIAL_CLASSES: Record<string, SocialClass> = {
  A: { code: 'A', label: 'Upper', monthlyIncomeRange: { min: 10000, max: Infinity } },
  B: { code: 'B', label: 'Upper-middle', monthlyIncomeRange: { min: 5000, max: 10000 } },
  C: { code: 'C', label: 'Middle', monthlyIncomeRange: { min: 2000, max: 5000 } },
  D: { code: 'D', label: 'Lower-middle', monthlyIncomeRange: { min: 1000, max: 2000 } },
  E: { code: 'E', label: 'Lower', monthlyIncomeRange: { min: 0, max: 1000 } }
}

// ============================================================================
// HOUSEHOLD TYPES
// ============================================================================

export interface HouseholdProfile extends Household {
  area?: Area
  microArea?: any
  patients?: Patient[]
  infrastructureStatus?: InfrastructureStatus
}

export interface InfrastructureStatus {
  hasWater: boolean
  hasElectricity: boolean
  hasSewage: boolean
  hasGarbage: boolean
  waterType?: 'PUBLIC' | 'WELL' | 'STREAM' | 'OTHER'
  electricityType?: 'PUBLIC' | 'SOLAR' | 'GENERATOR' | 'OTHER'
}

export interface VulnerabilityLevel {
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskFactors: string[]
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

export interface GeographicAddress extends Address {
  area?: Area
  neighborhood?: Neighborhood
  district?: District
  zone?: Zone
  city?: City
  state?: State
  country?: Country
  patient?: Patient
}

export interface AddressType {
  code: 'RESIDENTIAL' | 'COMMERCIAL' | 'INSTITUTIONAL' | 'OTHER'
  label: string
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface AreaReport {
  areaId: string
  areaName: string
  generatedAt: Date
  population: number
  households: number
  averageVulnerability: number
  acsTeam: ACSCoverage
  infrastructure: InfrastructureGaps
  topRisks: string[]
}

export interface InfrastructureGaps {
  waterAccess: number
  electricityAccess: number
  sewageAccess: number
  garbageAccess: number
  criticalGaps: string[]
}

export interface PSFStatistics {
  totalPatients: number
  enrolledInPSF: number
  enrollmentRate: number
  familyGroups: number
  averageFamilySize: number
  economicDistribution: Record<string, number>
  vulnerabilityDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

export interface GeographicSearchFilters {
  level?: 'country' | 'state' | 'city' | 'zone' | 'district' | 'neighborhood' | 'area'
  keyword?: string
  stateCode?: string
  cityIbgeCode?: string
  areaId?: string
  limit?: number
  offset?: number
}

export interface PatientSearchFilters {
  areaId?: string
  familyNumber?: string
  socialVulnerability?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  economicClass?: 'A' | 'B' | 'C' | 'D' | 'E'
  minVulnerabilityScore?: number
  maxVulnerabilityScore?: number
  limit?: number
  offset?: number
}

export interface HouseholdSearchFilters {
  areaId?: string
  economicClass?: 'A' | 'B' | 'C' | 'D' | 'E'
  hasWater?: boolean
  hasElectricity?: boolean
  hasSewage?: boolean
  minVulnerability?: number
  maxVulnerability?: number
  limit?: number
  offset?: number
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Country,
  State,
  City,
  Zone,
  District,
  Subprefecture,
  Neighborhood,
  Area,
  User,
  Patient,
  Household,
  Address
}
