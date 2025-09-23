// Address, Place, MicroArea services using Prisma
import { prisma } from '@/lib/prisma'
import type { MicroArea } from '@prisma/client'

// Simple in-memory cache (could be replaced by Redis layer later)
let _microAreaCache: { loadedAt: number; items: Array<{ id:string; centroidLat:number|null; centroidLng:number|null; polygonGeo:string|null }> } | null = null
const MICROAREA_CACHE_TTL_MS = 60_000

function pointInPolygon(point:[number,number], polygon:number[][][]): boolean {
  // Assumes polygon: [ [ [lng,lat], ... ] ] outer ring only; ignores holes
  const [x,y] = point
  let inside = false
  const ring = polygon[0]
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj - xi) * (y - yi) / ((yj - yi)||1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

class MicroAreaLocator {
  static async load(): Promise<typeof _microAreaCache> {
    if (_microAreaCache && (Date.now() - _microAreaCache.loadedAt) < MICROAREA_CACHE_TTL_MS) return _microAreaCache
    const rows = await prisma.microArea.findMany({ select: { id:true, centroidLat:true, centroidLng:true, polygonGeo:true } })
    _microAreaCache = { loadedAt: Date.now(), items: rows }
    return _microAreaCache
  }
  static async locate(coord:{lat:number,lng:number}): Promise<string|undefined> {
    const cache = await this.load()
    if (!cache) return undefined
    const { lat, lng } = coord
    // 1. Polygon inclusion
  for (const ma of cache.items) {
      if (!ma.polygonGeo) continue
      try {
        const feat = JSON.parse(ma.polygonGeo)
        if (feat?.geometry?.type === 'Polygon') {
          if (pointInPolygon([lng,lat], feat.geometry.coordinates)) return ma.id
        } else if (feat?.geometry?.type === 'MultiPolygon') {
          for (const poly of feat.geometry.coordinates) {
            if (pointInPolygon([lng,lat], poly)) return ma.id
          }
        }
      } catch { /* ignore malformed */ }
    }
    // 2. Nearest centroid fallback
    let best: { id:string; dist:number } | null = null
  for (const ma of cache.items) {
      if (ma.centroidLat == null || ma.centroidLng == null) continue
      const dLat = lat - ma.centroidLat
      const dLng = lng - ma.centroidLng
      const dist = dLat*dLat + dLng*dLng
      if (!best || dist < best.dist) best = { id: ma.id, dist }
    }
    return best?.id
  }
  static invalidate() { _microAreaCache = null }
}

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
    // If no microAreaId but we have coordinates, attempt naive proximity association
    if (!data.microAreaId && data.latitude !== undefined && data.longitude !== undefined) {
      // Try polygon inclusion first, fallback to centroid proximity
      data.microAreaId = await MicroAreaLocator.locate({ lat: data.latitude, lng: data.longitude }) || data.microAreaId
    }
    return prisma.address.create({ data })
  }
  static async listAddressesByPatient(patientId: string) {
    return prisma.address.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } })
  }
  static async listAllGeocoded() {
    return prisma.address.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true, microAreaId: true, patientId: true }
    })
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
    const created = await prisma.microArea.create({ data })
    MicroAreaLocator.invalidate()
    return created
  }
  static async listMicroAreas() {
    return prisma.microArea.findMany({ orderBy: { name: 'asc' } })
  }
  static async updateMicroArea(id: string, data: Partial<MicroAreaInput>) {
    const updated = await prisma.microArea.update({ where: { id }, data })
    MicroAreaLocator.invalidate()
    return updated
  }
  static async deleteMicroArea(id: string) {
    const deleted = await prisma.microArea.delete({ where: { id } })
    MicroAreaLocator.invalidate()
    return deleted
  }
}
