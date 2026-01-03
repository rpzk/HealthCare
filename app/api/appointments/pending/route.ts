import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * GET /api/appointments/pending
 * Lista agendamentos aguardando aprovação
 * Apenas ADMIN e RECEPTIONIST
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Only admin and receptionist can see pending appointments
    if (!['ADMIN', 'RECEPTIONIST'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este recurso' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('showAll') === 'true'

    // Get pending appointments (auto-booked by patients)
    const appointments = await prisma.consultation.findMany({
      where: {
        status: showAll ? undefined : 'SCHEDULED',
        notes: {
          contains: 'Auto-agendamento',
        },
        scheduledDate: {
          gte: new Date(),
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            cpf: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' }, // Mais antigos primeiro
        { scheduledDate: 'asc' },
      ],
    })

    // Separate by status
    const pending = appointments.filter((a) => a.status === 'SCHEDULED')
    const confirmed = appointments.filter((a) => a.status === 'IN_PROGRESS')
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED')

    return NextResponse.json({
      success: true,
      summary: {
        total: appointments.length,
        pending: pending.length,
        confirmed: confirmed.length,
        cancelled: cancelled.length,
      },
      appointments: {
        pending,
        confirmed,
        cancelled,
      },
    })
  } catch (error) {
    console.error('[Pending Appointments] Error fetching:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos pendentes' },
      { status: 500 }
    )
  }
}

const approveSchema = z.object({
  appointmentId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

/**
 * PATCH /api/appointments/pending
 * Aprovar ou rejeitar agendamento
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Only admin and receptionist can approve/reject
    if (!['ADMIN', 'RECEPTIONIST'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para aprovar agendamentos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parseResult = approveSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { appointmentId, action, notes } = parseResult.data

    // Verify appointment exists and is pending
    const appointment = await prisma.consultation.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true },
        },
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    if (appointment.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: `Agendamento já foi processado (status: ${appointment.status})` },
        { status: 400 }
      )
    }

    // Update status
    const newStatus = action === 'approve' ? 'IN_PROGRESS' : 'CANCELLED'
    const actionNote = action === 'approve' ? 'aprovado' : 'rejeitado'
    const updatedNotes = `${appointment.notes || ''}\n\n[${new Date().toLocaleString('pt-BR')}] ${actionNote.toUpperCase()} por ${session.user.name || session.user.email}${notes ? `: ${notes}` : ''}`

    const updated = await prisma.consultation.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        notes: updatedNotes,
      },
      include: {
        patient: {
          select: { name: true, email: true, phone: true },
        },
        doctor: {
          select: { name: true, email: true },
        },
      },
    })

    // TODO: Enviar notificação ao paciente
    console.log(
      `[Appointment ${action === 'approve' ? 'Approved' : 'Rejected'}] ID: ${appointmentId} by ${session.user.email}`
    )
    console.log(`Patient: ${updated.patient.name} (${updated.patient.email})`)
    console.log(`Doctor: ${updated.doctor.name}`)
    console.log(`Scheduled: ${updated.scheduledDate}`)

    // TODO: Implementar envio de email/WhatsApp
    // if (action === 'approve') {
    //   await sendAppointmentConfirmationEmail(updated)
    //   await sendWhatsAppNotification(updated.patient.phone, 'appointment_confirmed')
    // } else {
    //   await sendAppointmentRejectionEmail(updated, notes)
    //   await sendWhatsAppNotification(updated.patient.phone, 'appointment_rejected')
    // }

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Agendamento aprovado com sucesso!' 
        : 'Agendamento rejeitado',
      appointment: {
        id: updated.id,
        status: updated.status,
        scheduledDate: updated.scheduledDate,
        patientName: updated.patient.name,
        doctorName: updated.doctor.name,
      },
    })
  } catch (error) {
    console.error('[Approve Appointment] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar agendamento' },
      { status: 500 }
    )
  }
}
