import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { PrescriptionsServiceDb } from '@/lib/prescriptions-service'
import { DigitalSignatureService } from '@/lib/digital-signature-service'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // 1. Fetch prescription
    const prescription = await PrescriptionsServiceDb.getPrescriptionById(id as string)
    if (!prescription) {
      return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
    }

    // 2. Check if user is the doctor who created it (or admin)
    if (prescription.doctorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // 3. Check if already signed
    if (prescription.digitalSignature) {
      return NextResponse.json({ error: 'Prescrição já assinada' }, { status: 400 })
    }

    // 4. Generate content for signing
    const contentToSign = JSON.stringify({
      id: prescription.id,
      medications: prescription.medications,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      date: prescription.createdAt
    })

    // 5. Sign
    const signatureResult = await DigitalSignatureService.signDocument(contentToSign, user.id)

    // 6. Update database
    const updated = await prisma.prescription.update({
      where: { id: id as string },
      data: {
        digitalSignature: signatureResult.signature,
        status: 'ACTIVE'
      } as any // Cast to any to avoid type errors if client is not fully regenerated
    })

    return NextResponse.json({
      success: true,
      signature: (updated as any).digitalSignature,
      signedAt: signatureResult.timestamp
    })

  } catch (error) {
    console.error('Erro ao assinar prescrição:', error)
    return NextResponse.json(
      { error: 'Erro interno ao assinar documento' },
      { status: 500 }
    )
  }
})
