import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { AddressService } from '@/lib/address-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const microAreaId = searchParams.get('microAreaId') || undefined
  const data = await AddressService.listPlaces({ microAreaId: microAreaId || undefined })
  return NextResponse.json(data)
})

export const POST = withPatientAuth(async (req) => {
  const body = await req.json()
  const created = await AddressService.createPlace(body)
  return NextResponse.json(created, { status: 201 })
})
