// Address, Place, MicroArea services using Prisma
import { prisma } from '@/lib/prisma'

export type AddressInput = {
  street: string
  number?: string
  complement?: string
  neighborhood?: string
  city: string
  state: string
  zipCode?: string
  latitude?: number
  longitude?: number
  isPrimary?: boolean
  patientId?: string
  microAreaId?: string
}

export type PlaceInput = {
  name: string
  description?: string
  category?: string
  latitude?: number
  longitude?: number
  addressId?: string
  microAreaId?: string
}

export type MicroAreaInput = {
  name: string
  code?: string
  description?: string
  polygonGeo?: string // GeoJSON
  centroidLat?: number
  centroidLng?: number
}

export class AddressService {
  static async createAddress(data: AddressInput) {
    return prisma.address.create({ data })
  }
  static async listAddressesByPatient(patientId: string) {
    return prisma.address.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } })
  }
  static async updateAddress(id: string, data: Partial<AddressInput>) {
    return prisma.address.update({ where: { id }, data })
  }
  static async deleteAddress(id: string) {
    return prisma.address.delete({ where: { id } })
  }

  static async createPlace(data: PlaceInput) {
    return prisma.place.create({ data })
  }
  static async listPlaces(params: { microAreaId?: string } = {}) {
    return prisma.place.findMany({ where: { microAreaId: params.microAreaId } })
  }
  static async updatePlace(id: string, data: Partial<PlaceInput>) {
    return prisma.place.update({ where: { id }, data })
  }
  static async deletePlace(id: string) {
    return prisma.place.delete({ where: { id } })
  }

  static async createMicroArea(data: MicroAreaInput) {
    return prisma.microArea.create({ data })
  }
  static async listMicroAreas() {
    return prisma.microArea.findMany({ orderBy: { name: 'asc' } })
  }
  static async updateMicroArea(id: string, data: Partial<MicroAreaInput>) {
    return prisma.microArea.update({ where: { id }, data })
  }
  static async deleteMicroArea(id: string) {
    return prisma.microArea.delete({ where: { id } })
  }
}
