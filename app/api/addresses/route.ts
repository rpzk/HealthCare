import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { AddressService } from '@/lib/address-service'
import { validateAddress } from '@/lib/validation-schemas'
import { sanitizeSearchQuery, sanitizeText } from '@/lib/sanitization'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const patientId = sanitizeSearchQuery(searchParams.get('patientId') || '')
  if (patientId) {
    const data = await AddressService.listAddressesByPatient(patientId)
    return NextResponse.json(data)
  }
  // fallback: all with coordinates (for aggregated map)
  const all = await AddressService.listAllGeocoded()
  return NextResponse.json(all)
})

export const POST = withPatientAuth(async (req) => {
  const body = await req.json()
  const sanitizedBody = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? sanitizeText(v) : v]))
  const v = validateAddress(sanitizedBody)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const created = await AddressService.createAddress(v.data!)
  return NextResponse.json(created, { status: 201 })
})

export const PUT = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = sanitizeSearchQuery(searchParams.get('id') || '')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  const body = await req.json()
  const sanitizedBody = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? sanitizeText(v) : v]))
  const v = validateAddress(sanitizedBody)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const updated = await AddressService.updateAddress(id, v.data!)
  return NextResponse.json(updated)
})

export const DELETE = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = sanitizeSearchQuery(searchParams.get('id') || '')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  await AddressService.deleteAddress(id)
  return NextResponse.json({ ok: true })
})
