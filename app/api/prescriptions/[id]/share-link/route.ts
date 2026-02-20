/**
 * Gera link compartilhável para o paciente acessar o PDF sem login (ex.: WhatsApp).
 * Válido por 7 dias.
 * GET /api/prescriptions/[id]/share-link
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { createPrescriptionShareToken, DEFAULT_EXPIRY_DAYS } from '@/lib/prescription-share-token'

export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    select: { id: true, doctorId: true },
  })

  if (!prescription) {
    return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
  }

  if (prescription.doctorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const token = createPrescriptionShareToken(id, DEFAULT_EXPIRY_DAYS)
  const baseUrl =
    request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.headers.get('host')
        ? `${(request.headers.get('x-forwarded-proto') || 'https')}://${request.headers.get('host')}`
        : process.env.NEXTAUTH_URL || ''

  const url = `${baseUrl}/api/prescriptions/${id}/pdf?token=${encodeURIComponent(token)}`

  return NextResponse.json({
    url,
    expiresInDays: DEFAULT_EXPIRY_DAYS,
    message: 'Envie este link ao paciente (ex.: WhatsApp). Ele abre o PDF sem precisar logar. Válido por 7 dias.',
  })
})
