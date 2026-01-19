import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth'
import { CodingService } from '@/lib/coding-service'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const code = searchParams.get('code')
  if (!id && !code) return NextResponse.json({ error: 'id ou code é obrigatório' }, { status: 400 })
  const detail = await CodingService.getCodeDetail(id || code!)
  if (!detail) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  return NextResponse.json(detail)
})
