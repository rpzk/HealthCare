import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { AddressService } from '@/lib/address-service'

export const GET = withPatientAuth(async () => {
  const data = await AddressService.listMicroAreas()
  return NextResponse.json(data)
})

export const POST = withPatientAuth(async (req) => {
  const body = await req.json()
  const created = await AddressService.createMicroArea(body)
  return NextResponse.json(created, { status: 201 })
})
