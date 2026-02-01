/**
 * API Multi-Clínica
 * 
 * GET - Lista unidades/clínicas
 * POST - Cria nova unidade (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { multiClinicService } from '@/lib/multi-clinic-service'

export const runtime = 'nodejs'

/**
 * GET /api/clinics
 * Lista todas as unidades/clínicas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeStats = searchParams.get('includeStats') === 'true'

    // Listar clínicas
    const clinics = await multiClinicService.getClinics()

    // Se solicitado, incluir estatísticas
    if (includeStats) {
      const stats = await multiClinicService.getClinicStats()
      
      const clinicsWithStats = clinics.map((clinic) => {
        const clinicStats = stats.find(s => s.clinicId === clinic.id)
        return { ...clinic, stats: clinicStats }
      })
      
      return NextResponse.json({
        clinics: clinicsWithStats,
        total: clinicsWithStats.length
      })
    }

    return NextResponse.json({
      clinics,
      total: clinics.length
    })
  } catch (error) {
    console.error('[API] Erro ao listar clínicas:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

/**
 * POST /api/clinics
 * Cria nova unidade
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Apenas administradores podem criar unidades' 
      }, { status: 403 })
    }

    const body = await request.json()

    // Validação básica
    if (!body.name) {
      return NextResponse.json({ 
        error: 'Nome é obrigatório' 
      }, { status: 400 })
    }

    const clinic = await multiClinicService.createClinic({
      name: body.name,
      address: body.address,
      phone: body.phone,
      isActive: body.isActive ?? true
    })

    return NextResponse.json({
      success: true,
      clinic
    }, { status: 201 })

  } catch (error) {
    console.error('[API] Erro ao criar clínica:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
