/**
 * API Multi-Clínica - Detalhes e Estatísticas
 * 
 * GET - Detalhes de uma unidade
 * PUT - Atualiza configurações da unidade
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { multiClinicService } from '@/lib/multi-clinic-service'

export const runtime = 'nodejs'

/**
 * GET /api/clinics/[id]
 * Detalhes de uma unidade específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: clinicId } = await params
    const searchParams = request.nextUrl.searchParams
    const includeStats = searchParams.get('includeStats') === 'true'
    const includeUsers = searchParams.get('includeUsers') === 'true'
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'

    // Buscar clínica
    const clinic = await multiClinicService.getClinicById(clinicId)
    if (!clinic) {
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    }

    const result: Record<string, unknown> = { clinic }

    // Estatísticas
    if (includeStats) {
      const stats = await multiClinicService.getClinicStats(clinicId)
      result.stats = stats[0] || null
    }

    // Usuários da clínica
    if (includeUsers) {
      result.users = await multiClinicService.getClinicUsers(clinicId)
    }

    // Analytics avançados
    if (includeAnalytics) {
      result.analytics = await multiClinicService.getClinicAnalytics(clinicId)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Erro ao buscar clínica:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

/**
 * PUT /api/clinics/[id]
 * Atualiza configurações de uma unidade
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Apenas administradores podem editar unidades' 
      }, { status: 403 })
    }

    const { id: clinicId } = await params
    const body = await request.json()

    // Verificar se clínica existe
    const clinic = await multiClinicService.getClinicById(clinicId)
    if (!clinic) {
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
    }

    // Atualizar clínica
    const updated = await multiClinicService.updateClinic(clinicId, {
      name: body.name,
      address: body.address,
      phone: body.phone,
      isActive: body.isActive
    })

    if (!updated) {
      return NextResponse.json({ 
        error: 'Erro ao atualizar unidade' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clinic: updated
    })
  } catch (error) {
    console.error('[API] Erro ao atualizar clínica:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
