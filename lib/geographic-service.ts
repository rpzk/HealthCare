/**
 * GeographicService
 * Manages geographic hierarchy queries and operations for SSF integration
 * Handles country, state, city, zone, district, subprefecture, neighborhood, and area data
 */

import type { Country, State, City, Zone, District, Subprefecture, Neighborhood, Area } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface GeographicHierarchyPath {
  country?: Country
  state?: State
  city?: City
  zone?: Zone
  district?: District
  subprefecture?: Subprefecture
  neighborhood?: Neighborhood
  area?: Area
}

export interface GeographicSearchCriteria {
  countryCode?: string
  stateCode?: string
  cityIbgeCode?: string
  cityName?: string
  keyword?: string
}

export class GeographicService {
  /**
   * Get complete geographic hierarchy path for an area
   */
  async getHierarchyPath(areaId: string): Promise<GeographicHierarchyPath | null> {
    try {
      const area = await prisma.area.findUnique({
        where: { id: areaId },
        include: {
          neighborhood: {
            include: {
              subprefecture: {
                include: {
                  district: {
                    include: {
                      zone: {
                        include: {
                          city: {
                            include: {
                              state: {
                                include: {
                                  country: true
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!area) return null

      return {
        area,
        neighborhood: area.neighborhood,
        subprefecture: area.neighborhood?.subprefecture,
        district: area.neighborhood?.subprefecture?.district,
        zone: area.neighborhood?.subprefecture?.district?.zone,
        city: area.neighborhood?.subprefecture?.district?.zone?.city,
        state: area.neighborhood?.subprefecture?.district?.zone?.city?.state,
        country: area.neighborhood?.subprefecture?.district?.zone?.city?.state?.country
      }
    } catch (error) {
      logger.error('Error getting hierarchy path:', error)
      return null
    }
  }

  /**
   * Search for geographic entities by criteria
   */
  async searchGeographic(criteria: GeographicSearchCriteria) {
    try {
      const results: any = {}

      // Search cities
      if (criteria.keyword || criteria.cityName || criteria.cityIbgeCode) {
        results.cities = await prisma.city.findMany({
          where: {
            OR: [
              { name: { contains: criteria.keyword || criteria.cityName, mode: 'insensitive' } },
              { ibgeCode: criteria.cityIbgeCode }
            ]
          },
          include: { state: true },
          take: 10
        })
      }

      // Search states
      if (criteria.keyword || criteria.stateCode) {
        results.states = await prisma.state.findMany({
          where: {
            OR: [
              { name: { contains: criteria.keyword, mode: 'insensitive' } },
              { code: criteria.stateCode }
            ]
          },
          include: { country: true },
          take: 10
        })
      }

      // Search neighborhoods
      if (criteria.keyword) {
        results.neighborhoods = await prisma.neighborhood.findMany({
          where: {
            name: { contains: criteria.keyword, mode: 'insensitive' }
          },
          include: { subprefecture: true },
          take: 10
        })
      }

      // Search areas
      if (criteria.keyword) {
        results.areas = await prisma.area.findMany({
          where: {
            OR: [
              { name: { contains: criteria.keyword, mode: 'insensitive' } },
              { description: { contains: criteria.keyword, mode: 'insensitive' } }
            ]
          },
          include: { neighborhood: true },
          take: 10
        })
      }

      return results
    } catch (error) {
      logger.error('Error searching geographic data:', error)
      throw error
    }
  }

  /**
   * Get all areas in a city
   */
  async getAreasByCity(cityId: string) {
    try {
      return await prisma.area.findMany({
        where: {
          neighborhood: {
            subprefecture: {
              district: {
                zone: {
                  cityId
                }
              }
            }
          }
        },
        include: {
          neighborhood: {
            include: {
              subprefecture: {
                include: {
                  district: {
                    include: {
                      zone: true
                    }
                  }
                }
              }
            }
          },
          microAreas: true
        }
      })
    } catch (error) {
      logger.error('Error getting areas by city:', error)
      throw error
    }
  }

  /**
   * Get all areas in a state
   */
  async getAreasByState(stateId: string) {
    try {
      return await prisma.area.findMany({
        where: {
          neighborhood: {
            subprefecture: {
              district: {
                zone: {
                  city: {
                    stateId
                  }
                }
              }
            }
          }
        },
        include: {
          neighborhood: {
            include: {
              subprefecture: {
                include: {
                  district: true
                }
              }
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error getting areas by state:', error)
      throw error
    }
  }

  /**
   * Get statistics for a geographic region
   */
  async getRegionStatistics(areaId: string) {
    try {
      const area = await prisma.area.findUnique({
        where: { id: areaId }
      })

      if (!area) throw new Error('Area not found')

      const [
        microAreaCount,
        householdCount,
        acsUserCount,
        acsHistoryCount
      ] = await Promise.all([
        prisma.microArea.count({ where: { areaId } }),
        prisma.household.count({ where: { areaId } }),
        prisma.user.count({ where: { assignedAreaId: areaId } }),
        prisma.aCSHistory.count({ where: { areaId } })
      ])

      return {
        areaId,
        areaName: area.name,
        microAreas: microAreaCount,
        households: householdCount,
        acsUsers: acsUserCount,
        acsHistoryRecords: acsHistoryCount
      }
    } catch (error) {
      logger.error('Error getting region statistics:', error)
      throw error
    }
  }

  /**
   * Get geographic tree starting from a specific level
   */
  async getGeographicTree(startLevel: 'country' | 'state' | 'city' | 'zone', filter?: string) {
    try {
      switch (startLevel) {
        case 'country':
          return await prisma.country.findMany({
            include: {
              states: {
                include: {
                  cities: true
                }
              }
            }
          })

        case 'state':
          return await prisma.state.findMany({
            where: filter ? { code: filter } : undefined,
            include: {
              cities: {
                include: {
                  zones: true
                }
              }
            }
          })

        case 'city':
          return await prisma.city.findMany({
            where: filter ? { ibgeCode: filter } : undefined,
            include: {
              zones: {
                include: {
                  districts: true
                }
              }
            }
          })

        case 'zone':
          return await prisma.zone.findMany({
            where: filter ? { code: filter } : undefined,
            include: {
              districts: {
                include: {
                  subprefectures: true
                }
              }
            }
          })

        default:
          throw new Error('Invalid start level')
      }
    } catch (error) {
      logger.error('Error getting geographic tree:', error)
      throw error
    }
  }

  /**
   * Validate geographic path integrity
   */
  async validateGeographicPath(areaId: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      const path = await this.getHierarchyPath(areaId)

      if (!path) {
        errors.push('Area not found')
        return { valid: false, errors }
      }

      if (!path.area) errors.push('Area missing')
      if (!path.neighborhood) errors.push('Neighborhood missing')
      if (!path.subprefecture) errors.push('Subprefecture missing')
      if (!path.district) errors.push('District missing')
      if (!path.zone) errors.push('Zone missing')
      if (!path.city) errors.push('City missing')
      if (!path.state) errors.push('State missing')
      if (!path.country) errors.push('Country missing')

      return { valid: errors.length === 0, errors }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { valid: false, errors }
    }
  }

  /**
   * Get nearby areas
   */
  async getNearbyAreas(areaId: string, maxDepth: number = 2) {
    try {
      const area = await prisma.area.findUnique({
        where: { id: areaId },
        include: {
          neighborhood: {
            include: {
              subprefecture: {
                include: {
                  district: true
                }
              }
            }
          }
        }
      })

      if (!area?.neighborhood) return []

      // Get all areas in the same neighborhood and adjacent neighborhoods
      const nearbyAreas = await prisma.area.findMany({
        where: {
          OR: [
            // Same neighborhood
            { neighborhoodId: area.neighborhoodId },
            // Same subprefecture
            {
              neighborhood: {
                subprefectureId: area.neighborhood.subprefectureId
              }
            }
          ],
          NOT: { id: areaId }
        },
        take: 20
      })

      return nearbyAreas
    } catch (error) {
      logger.error('Error getting nearby areas:', error)
      throw error
    }
  }
}

export default new GeographicService()
