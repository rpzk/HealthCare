import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Buscar consulta por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const consultation = await ConsultationService.getConsultationById(params.id)
    return NextResponse.json({ consultation })
  } catch (error: any) {
    console.error('Erro ao buscar consulta:', error)
    
    if (error.message === 'Consulta não encontrada') {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar consulta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    
    // Converter data se fornecida
    if (body.scheduledDate) {
      body.scheduledDate = new Date(body.scheduledDate)
      
      // Validar data futura
      if (body.scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'A data da consulta deve ser futura' },
          { status: 400 }
        )
      }
    }

    const consultation = await ConsultationService.updateConsultation(params.id, body)

    return NextResponse.json({
      message: 'Consulta atualizada com sucesso',
      consultation
    })

  } catch (error: any) {
    console.error('Erro ao atualizar consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('já existe uma consulta')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Ações específicas na consulta
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result

    switch (action) {
      case 'start':
        result = await ConsultationService.startConsultation(params.id)
        break

      case 'complete':
        result = await ConsultationService.completeConsultation(params.id, data.notes)
        break

      case 'cancel':
        result = await ConsultationService.cancelConsultation(params.id, data.reason)
        break

      case 'no-show':
        result = await ConsultationService.markAsNoShow(params.id)
        break

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: 'Consulta atualizada com sucesso',
      consultation: result
    })

  } catch (error: any) {
    console.error('Erro ao executar ação na consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('podem ser')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar consulta (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || 'Cancelada pelo sistema'

    const consultation = await ConsultationService.cancelConsultation(params.id, reason)

    return NextResponse.json({
      message: 'Consulta cancelada com sucesso',
      consultation
    })

  } catch (error: any) {
    console.error('Erro ao cancelar consulta:', error)
    
    if (error.message.includes('não encontrada') || 
        error.message.includes('não podem ser canceladas')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
