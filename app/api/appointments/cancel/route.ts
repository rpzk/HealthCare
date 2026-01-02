import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendAppointmentCancellationEmail } from '@/lib/email-service'
import { z } from 'zod'

const cancelSchema = z.object({
  consultationId: z.string().min(1),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { consultationId, reason } = cancelSchema.parse(body)

    // Get consultation
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          select: { id: true, name: true, email: true },
        },
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    // Check authorization (patient or doctor)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwner =
      consultation.patient?.email === session.user.email ||
      consultation.doctor?.email === session.user.email

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this consultation' },
        { status: 403 }
      )
    }

    // Don't allow cancelling completed or already cancelled consultations
    if (['COMPLETED', 'CANCELLED'].includes(consultation.status)) {
      return NextResponse.json(
        { error: `Cannot cancel ${consultation.status.toLowerCase()} consultation` },
        { status: 400 }
      )
    }

    // Update consultation status
    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: 'CANCELLED',
      },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
      },
    })

    // Send cancellation email to patient
    if (updated.patient?.email) {
      try {
        const dateStr = updated.scheduledDate.toLocaleDateString('pt-BR')
        const timeStr = updated.scheduledDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendAppointmentCancellationEmail({
          patientEmail: updated.patient.email,
          patientName: updated.patient.name,
          doctorName: updated.doctor?.name || 'Profissional',
          date: dateStr,
          time: timeStr,
          reason: reason || 'Cancelado pelo sistema',
        })
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
        // Don't fail the cancellation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation cancelled successfully',
      consultation: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error cancelling consultation:', error)
    return NextResponse.json({ error: 'Failed to cancel consultation' }, { status: 500 })
  }
}

// GET - Check if consultation can be cancelled
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('id')

    if (!consultationId) {
      return NextResponse.json({ error: 'Consultation ID required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        patient: { select: { email: true } },
        doctor: { select: { email: true } },
      },
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    // Check authorization
    const canCancel =
      consultation.patient?.email === session.user.email ||
      consultation.doctor?.email === session.user.email

    const isCancellable = !['COMPLETED', 'CANCELLED'].includes(consultation.status)

    return NextResponse.json({
      success: true,
      canCancel,
      isCancellable,
      status: consultation.status,
    })
  } catch (error) {
    console.error('Error checking consultation:', error)
    return NextResponse.json({ error: 'Failed to check consultation' }, { status: 500 })
  }
}
