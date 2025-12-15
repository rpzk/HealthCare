/**
 * Enhanced AddressService with Geographic Hierarchy Support
 * Manages addresses with full geographic hierarchy integration
 */

import { PrismaClient, Address, AddressType } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateAddressInput {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  // New geographic hierarchy fields
  countryId?: string
  stateId?: string
  cityId?: string
  zoneId?: string
  districtId?: string
  subprefectureId?: string
  neighborhoodId?: string
  areaId?: string
  // Relations
  patientId?: string
  organizationId?: string
  userId?: string
  addressType?: AddressType
  isPrimary?: boolean
  isActive?: boolean
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {}

export interface AddressValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class EnhancedAddressService {
  /**
   * Create a new address with geographic hierarchy
   */
  async createAddress(input: CreateAddressInput) {
    try {
      // Validate geographic hierarchy if provided
      if (input.areaId) {
        const validation = await this.validateGeographicPath(input.areaId)
        if (!validation.valid) {
          throw new Error(`Invalid geographic path: ${validation.errors.join(', ')}`)
        }
      }

      // Create address
      const address = await prisma.address.create({
        data: {
          // Legacy fields for backward compatibility
          street: input.street || '',
          number: input.number,
          complement: input.complement,
          neighborhood: input.neighborhood || '',
          city: input.city || '',
          state: input.state || '',
          zipCode: input.zipCode,
          // New geographic hierarchy fields
          ...(input.countryId && { countryId: input.countryId }),
          ...(input.stateId && { stateId: input.stateId }),
          ...(input.cityId && { cityId: input.cityId }),
          ...(input.zoneId && { zoneId: input.zoneId }),
          ...(input.districtId && { districtId: input.districtId }),
          ...(input.subprefectureId && { subprefectureId: input.subprefectureId }),
          ...(input.neighborhoodId && { neighborhoodId: input.neighborhoodId }),
          ...(input.areaId && { areaId: input.areaId }),
          // Relations
          ...(input.patientId && { patientId: input.patientId }),
          ...(input.organizationId && { organizationId: input.organizationId }),
          ...(input.userId && { userId: input.userId }),
          addressType: input.addressType || 'RESIDENTIAL',
          isPrimary: input.isPrimary ?? false,
          isActive: input.isActive ?? true
        },
        include: {
          patient: true,
          area: {
            include: {
              neighborhood: {
                include: {
                  subprefecture: true
                }
              }
            }
          }
        }
      })

      return address
    } catch (error) {
      console.error('Error creating address:', error)
      throw error
    }
  }

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, input: UpdateAddressInput) {
    try {
      // Validate new geographic path if provided
      if (input.areaId) {
        const validation = await this.validateGeographicPath(input.areaId)
        if (!validation.valid) {
          throw new Error(`Invalid geographic path: ${validation.errors.join(', ')}`)
        }
      }

      const address = await prisma.address.update({
        where: { id: addressId },
        data: {
          ...(input.street && { street: input.street }),
          ...(input.number && { number: input.number }),
          ...(input.complement !== undefined && { complement: input.complement }),
          ...(input.neighborhood && { neighborhood: input.neighborhood }),
          ...(input.city && { city: input.city }),
          ...(input.state && { state: input.state }),
          ...(input.zipCode && { zipCode: input.zipCode }),
          ...(input.countryId && { countryId: input.countryId }),
          ...(input.stateId && { stateId: input.stateId }),
          ...(input.cityId && { cityId: input.cityId }),
          ...(input.zoneId && { zoneId: input.zoneId }),
          ...(input.districtId && { districtId: input.districtId }),
          ...(input.subprefectureId && { subprefectureId: input.subprefectureId }),
          ...(input.neighborhoodId && { neighborhoodId: input.neighborhoodId }),
          ...(input.areaId && { areaId: input.areaId }),
          ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
          ...(input.isActive !== undefined && { isActive: input.isActive })
        },
        include: {
          area: {
            include: {
              neighborhood: true
            }
          }
        }
      })

      return address
    } catch (error) {
      console.error('Error updating address:', error)
      throw error
    }
  }

  /**
   * Get address with full geographic context
   */
  async getAddressWithContext(addressId: string) {
    try {
      const address = await prisma.address.findUnique({
        where: { id: addressId },
        include: {
          country: true,
          state: true,
          city: {
            include: {
              state: true
            }
          },
          zone: true,
          district: true,
          subprefecture: true,
          neighborhood: true,
          area: {
            include: {
              neighborhood: {
                include: {
                  subprefecture: {
                    include: {
                      district: {
                        include: {
                          zone: {
                            include: {
                              city: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          patient: true,
          organization: true
        }
      })

      return address
    } catch (error) {
      console.error('Error getting address with context:', error)
      throw error
    }
  }

  /**
   * Get all addresses for a patient
   */
  async getPatientAddresses(patientId: string) {
    try {
      return await prisma.address.findMany({
        where: { patientId },
        include: {
          area: {
            include: {
              neighborhood: true
            }
          }
        },
        orderBy: { isPrimary: 'desc' }
      })
    } catch (error) {
      console.error('Error getting patient addresses:', error)
      throw error
    }
  }

  /**
   * Set primary address for a patient
   */
  async setPrimaryAddress(patientId: string, addressId: string) {
    try {
      // Unset current primary
      await prisma.address.updateMany({
        where: { patientId, isPrimary: true },
        data: { isPrimary: false }
      })

      // Set new primary
      const address = await prisma.address.update({
        where: { id: addressId },
        data: { isPrimary: true }
      })

      return address
    } catch (error) {
      console.error('Error setting primary address:', error)
      throw error
    }
  }

  /**
   * Validate address geographic path
   */
  async validateGeographicPath(areaId: string): Promise<AddressValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

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

      if (!area) {
        errors.push('Area not found')
      } else {
        if (!area.neighborhood?.id) errors.push('Neighborhood not properly linked')
        if (!area.neighborhood?.subprefecture?.id) errors.push('Subprefecture not properly linked')
        if (!area.neighborhood?.subprefecture?.district?.id) errors.push('District not properly linked')
        if (!area.neighborhood?.subprefecture?.district?.zone?.id) errors.push('Zone not properly linked')
        if (!area.neighborhood?.subprefecture?.district?.zone?.city?.id) errors.push('City not properly linked')
        if (!area.neighborhood?.subprefecture?.district?.zone?.city?.state?.id) errors.push('State not properly linked')
        if (!area.neighborhood?.subprefecture?.district?.zone?.city?.state?.country?.id) errors.push('Country not properly linked')
      }

      return { valid: errors.length === 0, errors, warnings }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { valid: false, errors, warnings }
    }
  }

  /**
   * Find addresses by area
   */
  async getAddressesByArea(areaId: string) {
    try {
      return await prisma.address.findMany({
        where: { areaId },
        include: {
          patient: true,
          area: true
        }
      })
    } catch (error) {
      console.error('Error getting addresses by area:', error)
      throw error
    }
  }

  /**
   * Get address statistics for a geographic region
   */
  async getAreaAddressStatistics(areaId: string) {
    try {
      const [
        totalAddresses,
        activeAddresses,
        residentialAddresses,
        commercialAddresses,
        withPatients
      ] = await Promise.all([
        prisma.address.count({ where: { areaId } }),
        prisma.address.count({ where: { areaId, isActive: true } }),
        prisma.address.count({ where: { areaId, addressType: 'RESIDENTIAL' } }),
        prisma.address.count({ where: { areaId, addressType: 'COMMERCIAL' } }),
        prisma.address.count({ where: { areaId, patientId: { not: null } } })
      ])

      return {
        areaId,
        total: totalAddresses,
        active: activeAddresses,
        residential: residentialAddresses,
        commercial: commercialAddresses,
        withPatients
      }
    } catch (error) {
      console.error('Error getting address statistics:', error)
      throw error
    }
  }

  /**
   * Migrate legacy addresses to geographic hierarchy
   */
  async migrateLegacyAddresses() {
    try {
      // Find addresses without geographic FKs
      const legacyAddresses = await prisma.address.findMany({
        where: {
          AND: [
            { cityId: null },
            { state: { not: null } },
            { city: { not: null } }
          ]
        }
      })

      console.log(`Found ${legacyAddresses.length} legacy addresses to migrate`)

      let successCount = 0
      let failureCount = 0

      for (const address of legacyAddresses) {
        try {
          // Try to find matching city by IBGE or name
          const matchingCity = await prisma.city.findFirst({
            where: {
              name: { contains: address.city || '', mode: 'insensitive' }
            },
            include: {
              state: true
            }
          })

          if (matchingCity) {
            // Get a default zone for the city
            const zone = await prisma.zone.findFirst({
              where: { cityId: matchingCity.id }
            })

            if (zone) {
              await prisma.address.update({
                where: { id: address.id },
                data: {
                  cityId: matchingCity.id,
                  stateId: matchingCity.stateId,
                  countryId: 'BR',
                  zoneId: zone.id
                }
              })
              successCount++
            }
          }
        } catch (error) {
          failureCount++
          console.error(`Failed to migrate address ${address.id}:`, error)
        }
      }

      return { successCount, failureCount, total: legacyAddresses.length }
    } catch (error) {
      console.error('Error migrating legacy addresses:', error)
      throw error
    }
  }
}

export default new EnhancedAddressService()
