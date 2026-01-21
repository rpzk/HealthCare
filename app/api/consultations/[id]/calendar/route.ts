/**
 * API para gerar arquivo .ics ou links de calendário para uma consulta
 * 
 * GET /api/consultations/[id]/calendar
 * 
 * Query params:
 * - format: 'ics' | 'links' (padrão: links)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateICS, generateCalendarLinks, generateCancellationICS } from '@/lib/ics-generator'
import { addMinutes } from 'date-fns'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'links'
    const { id } = params

    // Buscar consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados do evento
    const startTime = new Date(consultation.scheduledDate)
    const endTime = addMinutes(startTime, consultation.duration || 30)
    
    const typeLabels: Record<string, string> = {
      INITIAL: 'Consulta inicial',
      FOLLOW_UP: 'Retorno',
      EMERGENCY: 'Emergência',
      ROUTINE: 'Rotina',
      SPECIALIST: 'Especialista',
    }

    const eventData = {
      id: consultation.id,
      title: `Consulta Médica - Dr(a). ${consultation.doctor.name}`,
      description: `Consulta ${typeLabels[consultation.type] || 'Médica'} com Dr(a). ${consultation.doctor.name}\n\nPaciente: ${consultation.patient.name}\nTelefone: ${consultation.patient.phone || 'Não informado'}`,
      startTime,
      endTime,
      // Determine location based on available hints in the model
      location: consultation.meetingLink || consultation.videoUrl ? 'Online (Teleconsulta)' : (consultation.homeVisit ? 'Visita Domiciliar' : undefined),
      organizerName: consultation.doctor.name,
      organizerEmail: consultation.doctor.email,
      attendeeName: consultation.patient.name,
      attendeeEmail: consultation.patient.email || undefined,
      meetingLink: consultation.meetingLink || undefined,
    }

    // Se consulta está cancelada, gerar ICS de cancelamento
    if (consultation.status === 'CANCELLED') {
      if (format === 'ics') {
        const icsContent = generateCancellationICS(eventData)
        
        return new NextResponse(icsContent, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="consulta-cancelada-${id}.ics"`,
          },
        })
      }
      
      return NextResponse.json({
        status: 'cancelled',
        message: 'Esta consulta foi cancelada',
      })
    }

    // Gerar resposta baseada no formato solicitado
    if (format === 'ics') {
      const icsContent = generateICS(eventData)
      
      return new NextResponse(icsContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="consulta-${id}.ics"`,
        },
      })
    }

    // Retornar links para diferentes calendários
    const links = generateCalendarLinks(eventData)

    return NextResponse.json({
      success: true,
      consultation: {
        id: consultation.id,
        patient: consultation.patient.name,
        doctor: consultation.doctor.name,
        type: consultation.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: consultation.status,
      },
      calendarLinks: {
        google: links.google,
        outlook: links.outlook,
        yahoo: links.yahoo,
        downloadICS: `/api/consultations/${id}/calendar?format=ics`,
      },
    })

  } catch (error) {
    logger.error('[Consultation Calendar] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar dados do calendário' },
      { status: 500 }
    )
  }
}
