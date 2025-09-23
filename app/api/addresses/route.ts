import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { AddressService } from '@/lib/address-service'
import { validateAddress } from '@/lib/validation-schemas'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
  const data = await AddressService.listAddressesByPatient(patientId)
  return NextResponse.json(data)
})

export const POST = withPatientAuth(async (req) => {
  const body = await req.json()
  const v = validateAddress(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const created = await AddressService.createAddress(v.data!)
  return NextResponse.json(created, { status: 201 })
})

export const PUT = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  const body = await req.json()
  const v = validateAddress(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const updated = await AddressService.updateAddress(id, v.data!)
  return NextResponse.json(updated)
})

export const DELETE = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  await AddressService.deleteAddress(id)
  return NextResponse.json({ ok: true })
})
