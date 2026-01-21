import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface Point {
  lat: number
  lng: number
}

export class TerritoryService {
  
  /**
   * Verifica se um ponto está dentro de um polígono (Ray Casting algorithm)
   */
  static isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng
      const xj = polygon[j].lat, yj = polygon[j].lng
      
      const intersect = ((yi > point.lng) !== (yj > point.lng))
          && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  /**
   * Converte string de coordenadas (formato "lat,lng;lat,lng") ou GeoJSON string para array de pontos
   */
  static parsePolygon(geoString: string): Point[] {
    try {
      // Tenta parsear como JSON (GeoJSON)
      if (geoString.trim().startsWith('{')) {
        const geoJson = JSON.parse(geoString)
        if (geoJson.type === 'Polygon' && Array.isArray(geoJson.coordinates)) {
          // GeoJSON coordinates are [lng, lat]
          return geoJson.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        }
      }
      
      // Formato simples "lat,lng;lat,lng"
      return geoString.split(';').map(pair => {
        const [lat, lng] = pair.split(',').map(Number)
        return { lat, lng }
      })
    } catch (e) {
      logger.error('Erro ao parsear polígono:', e)
      return []
    }
  }

  /**
   * Encontra a Microárea correspondente a uma coordenada
   */
  static async findMicroAreaByLocation(lat: number, lng: number) {
    // 1. Busca otimizada usando Bounding Box (min/max lat/lng)
    // Isso evita carregar todas as microáreas em memória
    const candidates = await prisma.microArea.findMany({
      where: {
        minLat: { lte: lat },
        maxLat: { gte: lat },
        minLng: { lte: lng },
        maxLng: { gte: lng },
        polygonGeo: { not: null }
      }
    })

    // 2. Verificação precisa (Point in Polygon) nos candidatos
    for (const area of candidates) {
      if (!area.polygonGeo) continue
      
      const polygon = this.parsePolygon(area.polygonGeo)
      if (this.isPointInPolygon({ lat, lng }, polygon)) {
        return area
      }
    }

    return null
  }

  /**
   * Atualiza a Microárea de um endereço baseado em suas coordenadas
   */
  static async updateAddressMicroArea(addressId: string) {
    const address = await prisma.address.findUnique({
      where: { id: addressId }
    })

    if (!address || !address.latitude || !address.longitude) {
      return null
    }

    const microArea = await this.findMicroAreaByLocation(address.latitude, address.longitude)

    if (microArea) {
      await prisma.address.update({
        where: { id: addressId },
        data: { microAreaId: microArea.id }
      })
      return microArea
    }

    return null
  }

  /**
   * Busca a hierarquia territorial completa para uma coordenada
   * Retorna: Microárea -> Unidade -> Distrito -> Município
   */
  static async getTerritoryHierarchy(lat: number, lng: number) {
    const microArea = await this.findMicroAreaByLocation(lat, lng)
    
    if (!microArea) return null

    // Aqui você pode expandir para buscar a Unidade de Saúde vinculada à Microárea
    // Como o schema atual liga Address -> MicroArea, mas não explicita MicroArea -> Unidade (HealthUnit),
    // assumimos que isso será implementado via relacionamento ou convenção de código.
    
    return {
      microArea,
      // unit: ...
      // district: ...
    }
  }
}
