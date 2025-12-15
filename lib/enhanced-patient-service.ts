/**
 * Enhanced PatientService with PSF Support
 * Manages patient data with PSF enrollment and social assessment
 */

import { PrismaClient, Patient, Gender } from '@prisma/client'

const prisma = new PrismaClient()

export interface PSFEnrollmentInput {
  patientId: string
  familyNumber?: string
  sequenceInFamily?: number
  fatherName?: string
  rg?: string
  rgState?: string
  socialVulnerability?: string
  economicClass?: string
  monthlyFamilyIncome?: number
  preferredAddressId?: string
  areaId?: string
}

export interface PatientPSFData {
  patientId: string
  name: string
  familyNumber?: string
  sequenceInFamily?: number
  fatherName?: string
  rg?: string
  socialVulnerability?: string
  economicClass?: string
  monthlyFamilyIncome?: number
  enrolledInPSF: boolean
  assignedArea?: string
}

export interface FamilyGroupData {
  familyNumber: string
  areaId: string
  totalMembers: number
  economicClass?: string
  monthlyIncome?: number
  householdId?: string
  members: Array<{
    patientId: string
    name: string
    sequence: number
    gender: string
    birthDate?: Date
  }>
}

export interface SocialAssessmentResult {
  patientId: string
  name: string
  vulnerabilityScore: number
  economicClass: string
  riskFactors: string[]
  recommendations: string[]
}

export class EnhancedPatientService {
  /**
   * Enroll patient in PSF
   */
  async enrollInPSF(input: PSFEnrollmentInput) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: input.patientId }
      })

      if (!patient) throw new Error('Patient not found')

      // Validate area if provided
      if (input.areaId) {
        const area = await prisma.area.findUnique({
          where: { id: input.areaId }
        })
        if (!area) throw new Error('Area not found')
      }

      // Validate address if provided
      if (input.preferredAddressId) {
        const address = await prisma.address.findUnique({
          where: { id: input.preferredAddressId }
        })
        if (!address) throw new Error('Address not found')
      }

      const updatedPatient = await prisma.patient.update({
        where: { id: input.patientId },
        data: {
          familyNumber: input.familyNumber,
          sequenceInFamily: input.sequenceInFamily,
          fatherName: input.fatherName,
          rg: input.rg,
          rgState: input.rgState,
          socialVulnerability: input.socialVulnerability,
          economicClass: input.economicClass,
          monthlyFamilyIncome: input.monthlyFamilyIncome,
          preferredAddressId: input.preferredAddressId
        },
        include: {
          preferredAddress: true,
          addresses: true
        }
      })

      return updatedPatient
    } catch (error) {
      console.error('Error enrolling patient in PSF:', error)
      throw error
    }
  }

  /**
   * Get patient PSF data
   */
  async getPatientPSFData(patientId: string): Promise<PatientPSFData | null> {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          preferredAddress: {
            include: {
              area: true
            }
          }
        }
      })

      if (!patient) return null

      return {
        patientId: patient.id,
        name: patient.name || 'Unknown',
        familyNumber: patient.familyNumber || undefined,
        sequenceInFamily: patient.sequenceInFamily || undefined,
        fatherName: patient.fatherName || undefined,
        rg: patient.rg || undefined,
        socialVulnerability: patient.socialVulnerability || undefined,
        economicClass: patient.economicClass || undefined,
        monthlyFamilyIncome: patient.monthlyFamilyIncome || undefined,
        enrolledInPSF: !!(patient.familyNumber || patient.rg),
        assignedArea: patient.preferredAddress?.area?.name
      }
    } catch (error) {
      console.error('Error getting patient PSF data:', error)
      throw error
    }
  }

  /**
   * Get family group data
   */
  async getFamilyGroup(familyNumber: string, areaId?: string): Promise<FamilyGroupData | null> {
    try {
      const patients = await prisma.patient.findMany({
        where: {
          familyNumber,
          ...(areaId && { preferredAddress: { areaId } })
        },
        include: {
          preferredAddress: {
            include: {
              area: true
            }
          }
        },
        orderBy: { sequenceInFamily: 'asc' }
      })

      if (patients.length === 0) return null

      const household = await prisma.household.findFirst({
        where: {
          patients: {
            some: { id: patients[0].id }
          }
        }
      })

      return {
        familyNumber,
        areaId: areaId || patients[0].preferredAddress?.area?.id || 'unknown',
        totalMembers: patients.length,
        economicClass: patients[0].economicClass || undefined,
        monthlyIncome: patients[0].monthlyFamilyIncome || undefined,
        householdId: household?.id,
        members: patients.map(p => ({
          patientId: p.id,
          name: p.name || 'Unknown',
          sequence: p.sequenceInFamily || 0,
          gender: p.gender || 'OTHER',
          birthDate: p.birthDate || undefined
        }))
      }
    } catch (error) {
      console.error('Error getting family group:', error)
      throw error
    }
  }

  /**
   * Update family economic class
   */
  async updateFamilyEconomicClass(
    familyNumber: string,
    economicClass: string,
    monthlyIncome?: number
  ) {
    try {
      const result = await prisma.patient.updateMany({
        where: { familyNumber },
        data: {
          economicClass,
          ...(monthlyIncome && { monthlyFamilyIncome: monthlyIncome })
        }
      })

      return {
        updatedCount: result.count,
        familyNumber,
        economicClass
      }
    } catch (error) {
      console.error('Error updating family economic class:', error)
      throw error
    }
  }

  /**
   * Calculate social vulnerability score
   */
  async calculateVulnerabilityScore(patientId: string): Promise<number> {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          household: true,
          addresses: true
        }
      })

      if (!patient) throw new Error('Patient not found')

      let score = 0

      // Economic factors (0-30 points)
      if (patient.economicClass === 'E' || patient.economicClass === 'D') score += 30
      else if (patient.economicClass === 'C') score += 15
      else if (patient.economicClass === 'B') score += 5
      // A = 0

      // Family income (0-20 points)
      if (!patient.monthlyFamilyIncome) score += 20
      else if (patient.monthlyFamilyIncome < 500) score += 20
      else if (patient.monthlyFamilyIncome < 1000) score += 10
      else if (patient.monthlyFamilyIncome < 2000) score += 5
      // >= 2000 = 0

      // Household conditions (0-30 points)
      if (patient.household) {
        if (!patient.household.hasWater) score += 15
        if (!patient.household.hasElectricity) score += 10
        if (!patient.household.hasSewage) score += 5
      }

      // Family size (0-20 points)
      const dependents = await prisma.patient.count({
        where: { familyNumber: patient.familyNumber }
      })
      if (dependents > 5) score += 20
      else if (dependents > 3) score += 10
      else if (dependents > 1) score += 5

      return Math.min(score, 100)
    } catch (error) {
      console.error('Error calculating vulnerability score:', error)
      throw error
    }
  }

  /**
   * Get social assessment for patient
   */
  async getSocialAssessment(patientId: string): Promise<SocialAssessmentResult> {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      })

      if (!patient) throw new Error('Patient not found')

      const vulnerabilityScore = await this.calculateVulnerabilityScore(patientId)
      const riskFactors: string[] = []
      const recommendations: string[] = []

      // Identify risk factors
      if (patient.economicClass === 'E' || patient.economicClass === 'D') {
        riskFactors.push('Low economic class (D-E)')
        recommendations.push('Prioritize for social assistance programs')
      }

      if (!patient.monthlyFamilyIncome || patient.monthlyFamilyIncome < 1000) {
        riskFactors.push('Low family income')
        recommendations.push('Recommend for income supplement programs')
      }

      if (patient.socialVulnerability) {
        riskFactors.push(`Social vulnerability: ${patient.socialVulnerability}`)
      }

      if (vulnerabilityScore > 70) {
        recommendations.push('Schedule comprehensive social assessment')
        recommendations.push('Refer to PSF coordinator for home visit')
      }

      if (vulnerabilityScore > 50) {
        recommendations.push('Include in health promotion programs')
        recommendations.push('Monitor regularly')
      }

      return {
        patientId,
        name: patient.name || 'Unknown',
        vulnerabilityScore,
        economicClass: patient.economicClass || 'NOT_ASSESSED',
        riskFactors,
        recommendations
      }
    } catch (error) {
      console.error('Error getting social assessment:', error)
      throw error
    }
  }

  /**
   * Get patients by vulnerability in an area
   */
  async getPatientsByVulnerabilityInArea(
    areaId: string,
    minVulnerability: number = 70
  ) {
    try {
      const patients = await prisma.patient.findMany({
        where: {
          preferredAddress: {
            areaId
          }
        },
        include: {
          preferredAddress: {
            include: {
              area: true
            }
          }
        }
      })

      const assessments = await Promise.all(
        patients.map(p => this.getSocialAssessment(p.id))
      )

      return assessments
        .filter(a => a.vulnerabilityScore >= minVulnerability)
        .sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore)
    } catch (error) {
      console.error('Error getting vulnerable patients:', error)
      throw error
    }
  }

  /**
   * Get family group statistics for an area
   */
  async getFamilyGroupStatisticsInArea(areaId: string) {
    try {
      const patients = await prisma.patient.findMany({
        where: {
          preferredAddress: {
            areaId
          }
        }
      })

      // Group by family number
      const familyGroups = new Map<string, Patient[]>()

      for (const patient of patients) {
        if (patient.familyNumber) {
          const key = patient.familyNumber
          if (!familyGroups.has(key)) {
            familyGroups.set(key, [])
          }
          familyGroups.get(key)!.push(patient)
        }
      }

      // Calculate statistics
      const stats = {
        areaId,
        totalPatients: patients.length,
        enrolledInPSF: patients.filter(p => p.familyNumber).length,
        totalFamilyGroups: familyGroups.size,
        averageFamilySize: familyGroups.size > 0
          ? Array.from(familyGroups.values()).reduce((sum, group) => sum + group.length, 0) / familyGroups.size
          : 0,
        economicClassDistribution: {
          A: patients.filter(p => p.economicClass === 'A').length,
          B: patients.filter(p => p.economicClass === 'B').length,
          C: patients.filter(p => p.economicClass === 'C').length,
          D: patients.filter(p => p.economicClass === 'D').length,
          E: patients.filter(p => p.economicClass === 'E').length
        }
      }

      return stats
    } catch (error) {
      console.error('Error getting family group statistics:', error)
      throw error
    }
  }
}

export default new EnhancedPatientService()
