import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { PrescriptionsServiceDb } from '@/lib/prescriptions-service'

// GET /api/prescriptions/[id]
export const GET = withAuth(async (_req, { params }) => {
  try {
    const { id } = params
    const item = await PrescriptionsServiceDb.getById(id)
    if (!item) return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Erro ao buscar prescrição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})

// PATCH /api/prescriptions/[id]
export const PATCH = withAuth(async (req, { params, user }) => {
  try {
    const { id } = params
    const body = await req.json()
    // Permite atualização parcial: se vier medications, validar formato básico
    if (body.medications && !Array.isArray(body.medications)) {
      return NextResponse.json({ error: 'medications deve ser array' }, { status: 400 })
    }
    const updated = await PrescriptionsServiceDb.update(id, body)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar prescrição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})

// DELETE /api/prescriptions/[id]
export const DELETE = withAuth(async (_req, { params }) => {
  try {
    const { id } = params
    const result = await PrescriptionsServiceDb.remove(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao excluir prescrição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})
