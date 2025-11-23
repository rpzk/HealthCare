import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { rateLimiters } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

type GeocodeSuggestion = {
  label: string
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  lat: number
  lng: number
}

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const countrycodes = (searchParams.get('country') || 'br').toLowerCase()

  // Basic rate limit using default limiter
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  if (!q) {
    return NextResponse.json({ error: 'Parâmetro q é obrigatório' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', q)
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '8')
    if (countrycodes) url.searchParams.set('countrycodes', countrycodes)

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'HealthCareApp/1.0 (geocode)'
      },
      // Avoid Next.js fetch cache here
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao consultar geocodificador' }, { status: 502 })
    }
    const data: any[] = await res.json()

    // BR states map (fallback when ISO3166-2 not available)
    const UF_MAP: Record<string, string> = {
      'acre': 'AC','alagoas':'AL','amapá':'AP','amapa':'AP','amazonas':'AM','bahia':'BA','ceará':'CE','ceara':'CE','distrito federal':'DF','espírito santo':'ES','espirito santo':'ES','goiás':'GO','goias':'GO','maranhão':'MA','maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS','minas gerais':'MG','pará':'PA','para':'PA','paraíba':'PB','paraiba':'PB','paraná':'PR','parana':'PR','pernambuco':'PE','piauí':'PI','piaui':'PI','rio de janeiro':'RJ','rio grande do norte':'RN','rio grande do sul':'RS','rondônia':'RO','rondonia':'RO','roraima':'RR','santa catarina':'SC','são paulo':'SP','sao paulo':'SP','sergipe':'SE','tocantins':'TO'
    }

    const suggestions: GeocodeSuggestion[] = data.slice(0, 8).map((item) => {
      const addr = item.address || {}
      const city = addr.city || addr.town || addr.village || addr.municipality || undefined
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || undefined
      const iso = addr['ISO3166-2-lvl4'] || addr['ISO3166-2-lvl6'] || addr['ISO3166-2'] || ''
      const isoUF = typeof iso === 'string' && iso.startsWith('BR-') ? iso.slice(3) : undefined
      const stateName: string | undefined = addr.state || addr.region || undefined
      let state: string | undefined = isoUF
      if (!state && stateName) {
        const key = String(stateName).toLowerCase()
        state = UF_MAP[key]
      }
      const zipCode = addr.postcode || undefined
      const street = addr.road || addr.pedestrian || addr.path || addr.footway || undefined
      const number = addr.house_number || undefined
      const lat = parseFloat(item.lat)
      const lng = parseFloat(item.lon)
      const label = item.display_name as string
      return { label, street, number, neighborhood, city, state, zipCode, lat, lng }
    })

    return NextResponse.json({ results: suggestions })
  } catch (err) {
    console.error('[addresses/search] geocode error', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
})
