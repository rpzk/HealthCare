/**
 * GET /api/prescriptions/[id]/validar
 *
 * API pública para a página de validação (/validar/[id]).
 * Retorna apenas metadados de exibição: médico, CRM, data da assinatura e status.
 * Só retorna dados se a prescrição estiver assinada (SignedDocument).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = typeof params.id === 'string' ? params.id : params.id?.[0]
    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: {
        id: true,
        doctor: {
          select: {
            name: true,
            crmNumber: true,
            licenseState: true,
            speciality: true,
          },
        },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    const signed = await prisma.signedDocument.findFirst({
      where: { documentType: 'PRESCRIPTION', documentId: id },
      orderBy: { signedAt: 'desc' },
      select: { signedAt: true },
    })

    if (!signed) {
      return NextResponse.json(
        {
          error: 'Documento não assinado',
          message: 'Esta prescrição ainda não possui assinatura digital. Apenas documentos assinados podem ser validados.',
        },
        { status: 404 }
      )
    }

    const doctor = prescription.doctor
    const crm = doctor?.crmNumber || ''
    const crmState = doctor?.licenseState || ''

    return NextResponse.json({
      prescriptionId: id,
      doctorName: doctor?.name ?? 'Médico',
      crm: crm ? `CRM ${crm}/${crmState}` : 'CRM não informado',
      crmState,
      specialty: doctor?.speciality ?? undefined,
      signedAt: signed.signedAt.toISOString(),
      status: 'Documento Assinado Digitalmente via ICP-Brasil',
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao consultar validação' }, { status: 500 })
  }
}
