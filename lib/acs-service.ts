/**
 * ACSService
 * Manages ACS (Agente Comunitário de Saúde) assignments and tracking
 * Handles ACS-to-area assignments, history, and statistics
 */

import { PrismaClient, User, Area, ACSHistory } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

export interface ACSAssignmentInput {
  userId: string
  areaId: string
  microAreaId?: string
  assignmentReason?: string
  assignedByUserId?: string
  startDate?: Date
}

export interface ACSAssignmentStats {
  userId: string
  userName: string
  userEmail: string
  currentAreaId?: string
  currentMicroAreaId?: string
  assignedAt?: Date
  totalAssignments: number
  activeAssignments: number
  householdsCount: number
  patientsCount: number
}

export interface AreaCoverageStats {
  areaId: string
  areaName: string
  totalACS: number
  activeACS: number
  totalHouseholds: number
  householdsPerACS: number
  coveragePercentage: number
}

export class ACSService {
  /**
   * Assign ACS to an area
   */
  async assignACSToArea(input: ACSAssignmentInput): Promise<{ user: User; history: ACSHistory }> {
    try {
      // Validate user exists and is ACS
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: { role: true }
      })

      if (!user) throw new Error('User not found')
      if (user.role !== 'ACS' && user.role !== 'PSF_COORDINATOR') {
        throw new Error('User must be ACS or PSF_COORDINATOR to be assigned to an area')
      }

      // Validate area exists
      const area = await prisma.area.findUnique({
        where: { id: input.areaId }
      })

      if (!area) throw new Error('Area not found')

      // Unassign from previous area if any
      if (user.assignedAreaId && user.assignedAreaId !== input.areaId) {
        await this.unassignACSFromArea(input.userId, 'TRANSFERRED_TO_NEW_AREA')
      }

      // Update user with new area assignment
      const updatedUser = await prisma.user.update({
        where: { id: input.userId },
        data: {
          assignedAreaId: input.areaId,
          ...(input.microAreaId && { acsAssignedMicroAreaId: input.microAreaId })
        }
      })

      // Create history entry
      const history = await prisma.aCSHistory.create({
        data: {
          userId: input.userId,
          areaId: input.areaId,
          ...(input.microAreaId && { microAreaId: input.microAreaId }),
          assignedAt: input.startDate || new Date(),
          assignmentReason: input.assignmentReason || 'STANDARD_ASSIGNMENT',
          ...(input.assignedByUserId && { assignedByUserId: input.assignedByUserId })
        }
      })

      return { user: updatedUser, history }
    } catch (error) {
      console.error('Error assigning ACS to area:', error)
      throw error
    }
  }

  /**
   * Unassign ACS from current area
   */
  async unassignACSFromArea(userId: string, reason: string = 'VOLUNTARY_RESIGNATION') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) throw new Error('User not found')
      if (!user.assignedAreaId) throw new Error('User is not assigned to any area')

      // Close current history entry
      await prisma.aCSHistory.updateMany({
        where: {
          userId,
          unassignedAt: null
        },
        data: {
          unassignedAt: new Date(),
          assignmentReason: reason
        }
      })

      // Unassign user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          assignedAreaId: null,
          acsAssignedMicroAreaId: null
        }
      })

      return updatedUser
    } catch (error) {
      console.error('Error unassigning ACS from area:', error)
      throw error
    }
  }

  /**
   * Get ACS assignment history
   */
  async getACSHistory(userId: string, limit: number = 10) {
    try {
      return await prisma.aCSHistory.findMany({
        where: { userId },
        include: {
          user: true,
          area: {
            include: {
              neighborhood: true
            }
          },
          microArea: true,
          assignedByUser: true
        },
        orderBy: { assignedAt: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Error getting ACS history:', error)
      throw error
    }
  }

  /**
   * Get current active ACS for an area
   */
  async getActiveACSForArea(areaId: string) {
    try {
      return await prisma.user.findMany({
        where: {
          assignedAreaId: areaId,
          role: { in: ['ACS', 'PSF_COORDINATOR'] }
        },
        include: {
          acsHistory: {
            where: { unassignedAt: null },
            take: 1
          }
        }
      })
    } catch (error) {
      console.error('Error getting active ACS for area:', error)
      throw error
    }
  }

  /**
   * Get ACS assignment statistics
   */
  async getACSStats(userId: string): Promise<ACSAssignmentStats> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) throw new Error('User not found')

      const [
        totalAssignments,
        activeAssignments,
        householdCount,
        patientCount
      ] = await Promise.all([
        prisma.aCSHistory.count({ where: { userId } }),
        prisma.aCSHistory.count({
          where: { userId, unassignedAt: null }
        }),
        prisma.household.count({
          where: { areaId: user.assignedAreaId || undefined }
        }),
        prisma.patient.count({
          where: {
            addresses: {
              some: {
                areaId: user.assignedAreaId || undefined
              }
            }
          }
        })
      ])

      return {
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || 'Unknown',
        currentAreaId: user.assignedAreaId || undefined,
        currentMicroAreaId: user.acsAssignedMicroAreaId || undefined,
        totalAssignments,
        activeAssignments,
        householdsCount: householdCount,
        patientsCount: patientCount
      }
    } catch (error) {
      console.error('Error getting ACS stats:', error)
      throw error
    }
  }

  /**
   * Get area coverage statistics
   */
  async getAreaCoverageStats(areaId: string): Promise<AreaCoverageStats> {
    try {
      const area = await prisma.area.findUnique({
        where: { id: areaId }
      })

      if (!area) throw new Error('Area not found')

      const [
        totalACS,
        activeACS,
        totalHouseholds
      ] = await Promise.all([
        prisma.user.count({
          where: { assignedAreaId: areaId }
        }),
        prisma.user.count({
          where: {
            assignedAreaId: areaId,
            acsHistory: {
              some: { unassignedAt: null }
            }
          }
        }),
        prisma.household.count({
          where: { areaId }
        })
      ])

      const householdsPerACS = activeACS > 0 ? totalHouseholds / activeACS : 0
      const coveragePercentage = totalHouseholds > 0 ? (activeACS / totalACS) * 100 : 0

      return {
        areaId,
        areaName: area.name || 'Unknown',
        totalACS,
        activeACS,
        totalHouseholds,
        householdsPerACS: Math.round(householdsPerACS),
        coveragePercentage: Math.round(coveragePercentage)
      }
    } catch (error) {
      console.error('Error getting area coverage stats:', error)
      throw error
    }
  }

  /**
   * Bulk assign ACS to areas
   */
  async bulkAssignACS(assignments: ACSAssignmentInput[]) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const assignment of assignments) {
      try {
        await this.assignACSToArea(assignment)
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed for user ${assignment.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  /**
   * Get ACS rotation suggestions based on tenure
   */
  async getRotationSuggestions(maxTenureMonths: number = 24) {
    try {
      const cutoffDate = addDays(new Date(), -30 * maxTenureMonths)

      const assignments = await prisma.aCSHistory.findMany({
        where: {
          assignedAt: { lt: cutoffDate },
          unassignedAt: null
        },
        include: {
          user: true,
          area: true
        }
      })

      return assignments.map(a => ({
        userId: a.userId,
        userName: a.user?.name,
        currentArea: a.area?.name,
        assignedSince: a.assignedAt,
        tenureMonths: Math.round(
          (new Date().getTime() - a.assignedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ),
        reason: 'TENURE_ROTATION'
      }))
    } catch (error) {
      console.error('Error getting rotation suggestions:', error)
      throw error
    }
  }

  /**
   * Get unassigned ACS users
   */
  async getUnassignedACS() {
    try {
      return await prisma.user.findMany({
        where: {
          assignedAreaId: null,
          role: { in: ['ACS', 'PSF_COORDINATOR'] }
        },
        include: {
          acsHistory: {
            orderBy: { assignedAt: 'desc' },
            take: 1
          }
        }
      })
    } catch (error) {
      console.error('Error getting unassigned ACS:', error)
      throw error
    }
  }

  /**
   * Generate ACS performance report
   */
  async getACSPerformanceReport(areaId?: string) {
    try {
      const whereClause = areaId ? { assignedAreaId: areaId } : {}

      const acs = await prisma.user.findMany({
        where: {
          ...whereClause,
          role: { in: ['ACS', 'PSF_COORDINATOR'] }
        },
        include: {
          assignedArea: true,
          acsHistory: {
            where: { unassignedAt: null }
          }
        }
      })

      const report = await Promise.all(
        acs.map(async (user) => {
          const stats = await this.getACSStats(user.id)
          return {
            ...stats,
            assignmentDuration: user.acsHistory[0]
              ? Math.round(
                  (new Date().getTime() - user.acsHistory[0].assignedAt.getTime()) /
                  (1000 * 60 * 60 * 24)
                )
              : 0
          }
        })
      )

      return report
    } catch (error) {
      console.error('Error generating ACS performance report:', error)
      throw error
    }
  }

  /**
   * Bulk assign ACS to areas
   */
  async bulkAssignACS(
    assignments: ACSAssignmentInput[]
  ): Promise<{ successful: number; failed: number; errors: Array<{ index: number; error: string }> }> {
    const results = { successful: 0, failed: 0, errors: [] as Array<{ index: number; error: string }> }

    for (let i = 0; i < assignments.length; i++) {
      try {
        await this.assignACSToArea(assignments[i])
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }
}

export default new ACSService()
