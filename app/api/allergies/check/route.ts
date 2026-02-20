/**
 * API de Verificação de Alergias
 * 
 * POST - Verifica alergias do paciente contra medicamentos
 * GET - Retorna resumo de alergias do paciente
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AllergyAlertService } from '@/lib/allergy-alert-service'
import { z } from 'zod'

export const runtime = 'nodejs'

// Schema de validação
const checkAllergySchema = z.object({
  patientId: z.string().min(1),
  medications: z.array(z.object({
    name: z.string().min(1),
    id: z.string().optional()
  })).min(1)
})

// POST - Verificar alergias contra medicamentos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = checkAllergySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { patientId, medications } = parsed.data

    // Verificar alergias
    const result = await AllergyAlertService.checkAllergies(patientId, medications)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Allergy API] Erro POST:', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar alergias' },
      { status: 500 }
    )
  }
}

// GET - Resumo de alergias do paciente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId é obrigatório' },
        { status: 400 }
      )
    }

    const summary = await AllergyAlertService.getPatientAllergySummary(patientId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[Allergy API] Erro GET:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar alergias' },
      { status: 500 }
    )
  }
}
