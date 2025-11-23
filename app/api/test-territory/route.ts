import { NextResponse } from 'next/server'
import { TerritoryService } from '@/lib/territory-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const action = searchParams.get('action')

  if (action === 'check') {
    if (!lat || !lng) {
      return NextResponse.json({ error: 'Lat/Lng required' }, { status: 400 })
    }

    const start = performance.now()
    const microArea = await TerritoryService.findMicroAreaByLocation(lat, lng)
    const duration = performance.now() - start

    return NextResponse.json({
      found: !!microArea,
      microArea,
      duration: `${duration.toFixed(2)}ms`,
      testedPoint: { lat, lng }
    })
  }

  return NextResponse.json({ message: 'Use ?action=check&lat=...&lng=... or POST to seed' })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    if (body.action === 'seed') {
      // Criar uma Microárea de teste (Quadrado simples em torno de SP - Marco Zero)
      // Praça da Sé: -23.5505, -46.6333
      // Vamos criar um quadrado de ~1km
      
      const centerLat = -23.5505
      const centerLng = -46.6333
      const delta = 0.01 // aprox 1km

      const minLat = centerLat - delta
      const maxLat = centerLat + delta
      const minLng = centerLng - delta
      const maxLng = centerLng + delta

      // Polígono fechado (5 pontos, último igual ao primeiro)
      // Formato: lat,lng;lat,lng...
      const polygonString = [
        `${minLat},${minLng}`,
        `${maxLat},${minLng}`,
        `${maxLat},${maxLng}`,
        `${minLat},${maxLng}`,
        `${minLat},${minLng}`
      ].join(';')

      const microArea = await prisma.microArea.create({
        data: {
          name: 'Microárea Teste - Sé',
          code: 'TEST-001',
          polygonGeo: polygonString,
          minLat,
          maxLat,
          minLng,
          maxLng,
          centroidLat: centerLat,
          centroidLng: centerLng
        }
      })

      return NextResponse.json({ 
        message: 'Microárea de teste criada', 
        microArea 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
