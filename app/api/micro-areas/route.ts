import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth-v2'
import { AddressService } from '@/lib/address-service'
import { validateMicroArea } from '@/lib/validation-schemas'

export const GET = withPatientAuth(async () => {
  const data = await AddressService.listMicroAreas()
  return NextResponse.json(data)
})

export const POST = withPatientAuth(async (req, { user }) => {
  const body = await req.json()
  if (!body.changedByUser) body.changedByUser = user.id
  const v = validateMicroArea(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const created = await AddressService.createMicroArea(v.data!)
  return NextResponse.json(created, { status: 201 })
})

export const PUT = withPatientAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  const body = await req.json()
  if (!body.changedByUser) body.changedByUser = user.id
  const v = validateMicroArea(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const updated = await AddressService.updateMicroArea(id, v.data!)
  return NextResponse.json(updated)
})

export const DELETE = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  await AddressService.deleteMicroArea(id)
  return NextResponse.json({ ok: true })
})
