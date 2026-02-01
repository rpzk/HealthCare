/**
 * Public Booking Widget API
 * 
 * Endpoints públicos para o widget de agendamento
 * CORS habilitado para embed em sites externos
 */

import { NextRequest, NextResponse } from 'next/server'
import { publicBookingService } from '@/lib/public-booking-service'

// Headers CORS para permitir embed
function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Token',
    'Access-Control-Max-Age': '86400',
  }
}

// OPTIONS - Preflight CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

// GET - Obter dados públicos para o widget
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined
  const { searchParams } = new URL(request.url)
  
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'specialties': {
        const specialties = await publicBookingService.getAvailableSpecialties()
        return NextResponse.json(
          { specialties },
          { headers: corsHeaders(origin) }
        )
      }

      case 'professionals': {
        const specialty = searchParams.get('specialty') || undefined
        const professionals = await publicBookingService.getAvailableProfessionals(specialty)
        return NextResponse.json(
          { professionals },
          { headers: corsHeaders(origin) }
        )
      }

      case 'slots': {
        const dateStr = searchParams.get('date')
        const professionalId = searchParams.get('professional') || undefined
        
        if (!dateStr) {
          return NextResponse.json(
            { error: 'Date required' },
            { status: 400, headers: corsHeaders(origin) }
          )
        }
        
        const date = new Date(dateStr)
        const slots = await publicBookingService.getAvailableSlots(date, professionalId)
        return NextResponse.json(
          { date: dateStr, slots },
          { headers: corsHeaders(origin) }
        )
      }

      case 'lookup': {
        const code = searchParams.get('code')
        const cpf = searchParams.get('cpf')
        
        if (!code || !cpf) {
          return NextResponse.json(
            { error: 'Code and CPF required' },
            { status: 400, headers: corsHeaders(origin) }
          )
        }
        
        const booking = await publicBookingService.getBookingByCode(code, cpf)
        return NextResponse.json(booking, { headers: corsHeaders(origin) })
      }

      default:
        // Retornar especialidades por padrão
        const defaultSpecialties = await publicBookingService.getAvailableSpecialties()
        return NextResponse.json(
          { specialties: defaultSpecialties },
          { headers: corsHeaders(origin) }
        )
    }
  } catch (error) {
    console.error('[PublicBookingAPI] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

// POST - Criar agendamento ou cancelar
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined
  
  try {
    const body = await request.json()
    const action = body.action || 'book'

    switch (action) {
      case 'book': {
        // Validar campos obrigatórios
        const requiredFields = ['date', 'time', 'patientName', 'patientCpf', 'patientPhone', 'acceptedTerms']
        const missing = requiredFields.filter(f => !body[f])
        
        if (missing.length > 0) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Missing required fields',
              missing 
            },
            { status: 400, headers: corsHeaders(origin) }
          )
        }

        const result = await publicBookingService.createBooking({
          specialtyId: body.specialtyId,
          professionalId: body.professionalId,
          date: new Date(body.date),
          time: body.time,
          patientName: body.patientName,
          patientCpf: body.patientCpf,
          patientPhone: body.patientPhone,
          patientEmail: body.patientEmail,
          reason: body.reason,
          isFirstVisit: body.isFirstVisit ?? true,
          acceptedTerms: body.acceptedTerms
        })

        return NextResponse.json(result, {
          status: result.success ? 201 : 400,
          headers: corsHeaders(origin)
        })
      }

      case 'cancel': {
        if (!body.confirmationCode || !body.cpf) {
          return NextResponse.json(
            { success: false, error: 'Code and CPF required' },
            { status: 400, headers: corsHeaders(origin) }
          )
        }

        const cancelResult = await publicBookingService.cancelBooking(
          body.confirmationCode,
          body.cpf
        )

        return NextResponse.json(cancelResult, {
          status: cancelResult.success ? 200 : 400,
          headers: corsHeaders(origin)
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400, headers: corsHeaders(origin) }
        )
    }
  } catch (error) {
    console.error('[PublicBookingAPI] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
