/**
 * HouseholdService
 * Manages household data with social indicators and vulnerability assessment
 */

import { PrismaClient, Household } from '@prisma/client'

const prisma = new PrismaClient()

export interface HouseholdInput {
  microAreaId?: string
  areaId: string
  monthlyIncome?: number
  economicClass?: string
  numberOfRooms?: number
  hasWater?: boolean
  hasElectricity?: boolean
  hasSewage?: boolean
  hasGarbage?: boolean
  vulnerabilityScore?: number
}

export interface HouseholdStats {
  areaId: string
  totalHouseholds: number
  averageIncome: number
  averageRoomCount: number
  infrastructureIndicators: {
    hasWater: number
    hasElectricity: number
    hasSewage: number
    hasGarbage: number
  }
  vulnerabilityDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface HouseholdVulnerabilityAssessment {
  householdId: string
  areaName: string
  vulnerabilityScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  indicators: {
    income: boolean
    water: boolean
    electricity: boolean
    sewage: boolean
    garbage: boolean
    roomCount: boolean
  }
  recommendations: string[]
}

export class HouseholdService {
  /**
   * Create a new household
   */
  async createHousehold(input: HouseholdInput) {
    try {
      // Validate area exists
      const area = await prisma.area.findUnique({
        where: { id: input.areaId }
      })

      if (!area) throw new Error('Area not found')

      // Calculate vulnerability score
      const vulnerabilityScore = await this.calculateVulnerabilityScore(input)

      const household = await prisma.household.create({
        data: {
          areaId: input.areaId,
          microAreaId: input.microAreaId,
          monthlyIncome: input.monthlyIncome,
          economicClass: input.economicClass,
          numberOfRooms: input.numberOfRooms,
          hasWater: input.hasWater ?? true,
          hasElectricity: input.hasElectricity ?? true,
          hasSewage: input.hasSewage ?? true,
          hasGarbage: input.hasGarbage ?? true,
          vulnerabilityScore
        },
        include: {
          area: true,
          microArea: true
        }
      })

      return household
    } catch (error) {
      console.error('Error creating household:', error)
      throw error
    }
  }

  /**
   * Update household information
   */
  async updateHousehold(householdId: string, input: Partial<HouseholdInput>) {
    try {
      // Recalculate vulnerability score with new data
      const existing = await prisma.household.findUnique({
        where: { id: householdId }
      })

      if (!existing) throw new Error('Household not found')

      const mergedData = { ...existing, ...input }
      const vulnerabilityScore = await this.calculateVulnerabilityScore(mergedData)

      const household = await prisma.household.update({
        where: { id: householdId },
        data: {
          ...input,
          vulnerabilityScore
        },
        include: {
          area: true
        }
      })

      return household
    } catch (error) {
      console.error('Error updating household:', error)
      throw error
    }
  }

  /**
   * Calculate vulnerability score (0-100)
   */
  async calculateVulnerabilityScore(data: Partial<HouseholdInput>): Promise<number> {
    let score = 0

    // Income factors (0-35 points)
    if (!data.monthlyIncome) score += 35
    else if (data.monthlyIncome < 500) score += 35
    else if (data.monthlyIncome < 1000) score += 25
    else if (data.monthlyIncome < 2000) score += 15
    else if (data.monthlyIncome < 3000) score += 5

    // Infrastructure (0-35 points)
    if (data.hasWater === false) score += 20
    if (data.hasElectricity === false) score += 10
    if (data.hasSewage === false) score += 15
    if (data.hasGarbage === false) score += 5

    // Housing conditions (0-30 points)
    if (!data.numberOfRooms) score += 30
    else if (data.numberOfRooms < 2) score += 25
    else if (data.numberOfRooms < 3) score += 15
    else if (data.numberOfRooms < 4) score += 5

    return Math.min(score, 100)
  }

  /**
   * Get vulnerability assessment for a household
   */
  async getVulnerabilityAssessment(householdId: string): Promise<HouseholdVulnerabilityAssessment> {
    try {
      const household = await prisma.household.findUnique({
        where: { id: householdId },
        include: {
          area: true
        }
      })

      if (!household) throw new Error('Household not found')

      const vulnerabilityScore = household.vulnerabilityScore || 0
      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
        vulnerabilityScore < 25 ? 'LOW'
          : vulnerabilityScore < 50 ? 'MEDIUM'
            : vulnerabilityScore < 75 ? 'HIGH'
              : 'CRITICAL'

      const indicators = {
        income: !household.monthlyIncome || household.monthlyIncome < 1000,
        water: household.hasWater === false,
        electricity: household.hasElectricity === false,
        sewage: household.hasSewage === false,
        garbage: household.hasGarbage === false,
        roomCount: !household.numberOfRooms || household.numberOfRooms < 2
      }

      const recommendations: string[] = []

      if (indicators.income) {
        recommendations.push('Refer to income support programs')
        recommendations.push('Include in conditional cash transfer evaluation')
      }

      if (indicators.water || indicators.sewage) {
        recommendations.push('Coordinate with water/sanitation services')
        recommendations.push('Schedule home improvement assessment')
      }

      if (indicators.electricity) {
        recommendations.push('Coordinate with electrification program')
      }

      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        recommendations.push('Schedule urgent home visit')
        recommendations.push('Coordinate with social services')
        recommendations.push('Assess for emergency assistance')
      }

      return {
        householdId,
        areaName: household.area?.name || 'Unknown',
        vulnerabilityScore,
        riskLevel,
        indicators,
        recommendations
      }
    } catch (error) {
      console.error('Error getting vulnerability assessment:', error)
      throw error
    }
  }

  /**
   * Get household statistics for an area
   */
  async getAreaHouseholdStatistics(areaId: string): Promise<HouseholdStats> {
    try {
      const households = await prisma.household.findMany({
        where: { areaId }
      })

      if (households.length === 0) {
        return {
          areaId,
          totalHouseholds: 0,
          averageIncome: 0,
          averageRoomCount: 0,
          infrastructureIndicators: {
            hasWater: 0,
            hasElectricity: 0,
            hasSewage: 0,
            hasGarbage: 0
          },
          vulnerabilityDistribution: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          }
        }
      }

      // Calculate statistics
      const totalIncome = households.reduce((sum, h) => sum + (h.monthlyIncome || 0), 0)
      const totalRooms = households.reduce((sum, h) => sum + (h.numberOfRooms || 0), 0)

      const infrastructureIndicators = {
        hasWater: households.filter(h => h.hasWater).length,
        hasElectricity: households.filter(h => h.hasElectricity).length,
        hasSewage: households.filter(h => h.hasSewage).length,
        hasGarbage: households.filter(h => h.hasGarbage).length
      }

      const vulnerabilityDistribution = {
        low: households.filter(h => (h.vulnerabilityScore || 0) < 25).length,
        medium: households.filter(h => (h.vulnerabilityScore || 0) >= 25 && (h.vulnerabilityScore || 0) < 50).length,
        high: households.filter(h => (h.vulnerabilityScore || 0) >= 50 && (h.vulnerabilityScore || 0) < 75).length,
        critical: households.filter(h => (h.vulnerabilityScore || 0) >= 75).length
      }

      return {
        areaId,
        totalHouseholds: households.length,
        averageIncome: Math.round(totalIncome / households.length),
        averageRoomCount: Math.round(totalRooms / households.length * 10) / 10,
        infrastructureIndicators,
        vulnerabilityDistribution
      }
    } catch (error) {
      console.error('Error getting area household statistics:', error)
      throw error
    }
  }

  /**
   * Get households by vulnerability level in an area
   */
  async getHouseholdsByVulnerabilityLevel(
    areaId: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) {
    try {
      const scoreRange = riskLevel === 'LOW'
        ? { lte: 25 }
        : riskLevel === 'MEDIUM'
          ? { gte: 25, lt: 50 }
          : riskLevel === 'HIGH'
            ? { gte: 50, lt: 75 }
            : { gte: 75 }

      const households = await prisma.household.findMany({
        where: {
          areaId,
          vulnerabilityScore: scoreRange
        },
        include: {
          area: true,
          patients: true
        },
        orderBy: { vulnerabilityScore: 'desc' }
      })

      return households
    } catch (error) {
      console.error('Error getting households by vulnerability level:', error)
      throw error
    }
  }

  /**
   * Get infrastructure gaps in an area
   */
  async getInfrastructureGaps(areaId: string) {
    try {
      const households = await prisma.household.findMany({
        where: { areaId }
      })

      const gaps = {
        areaId,
        totalHouseholds: households.length,
        missingWater: households.filter(h => !h.hasWater).length,
        missingElectricity: households.filter(h => !h.hasElectricity).length,
        missingSewage: households.filter(h => !h.hasSewage).length,
        missingGarbage: households.filter(h => !h.hasGarbage).length,
        gaps: [] as string[]
      }

      if (gaps.missingWater > 0) {
        gaps.gaps.push(`${gaps.missingWater} households without water access`)
      }
      if (gaps.missingElectricity > 0) {
        gaps.gaps.push(`${gaps.missingElectricity} households without electricity`)
      }
      if (gaps.missingSewage > 0) {
        gaps.gaps.push(`${gaps.missingSewage} households without sewage`)
      }
      if (gaps.missingGarbage > 0) {
        gaps.gaps.push(`${gaps.missingGarbage} households without garbage collection`)
      }

      return gaps
    } catch (error) {
      console.error('Error getting infrastructure gaps:', error)
      throw error
    }
  }

  /**
   * Bulk update households
   */
  async bulkUpdateHouseholds(areaId: string, updates: Partial<HouseholdInput>) {
    try {
      const result = await prisma.household.updateMany({
        where: { areaId },
        data: updates
      })

      return {
        updatedCount: result.count,
        areaId
      }
    } catch (error) {
      console.error('Error bulk updating households:', error)
      throw error
    }
  }

  /**
   * Generate household report for an area
   */
  async generateAreaHouseholdReport(areaId: string) {
    try {
      const [
        statistics,
        infrastructureGaps,
        criticalHouseholds
      ] = await Promise.all([
        this.getAreaHouseholdStatistics(areaId),
        this.getInfrastructureGaps(areaId),
        this.getHouseholdsByVulnerabilityLevel(areaId, 'CRITICAL')
      ])

      return {
        areaId,
        generatedAt: new Date(),
        statistics,
        infrastructureGaps,
        criticalHouseholdsCount: criticalHouseholds.length,
        recommendedActions: [
          ...infrastructureGaps.gaps,
          `${criticalHouseholds.length} households need urgent intervention`
        ]
      }
    } catch (error) {
      console.error('Error generating household report:', error)
      throw error
    }
  }
}

export default new HouseholdService()
