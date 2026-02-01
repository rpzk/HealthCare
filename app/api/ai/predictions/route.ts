/**
 * Predictive AI API
 * 
 * Endpoints para previsões de IA:
 * - No-show prediction
 * - Overbooking recommendations  
 * - Patient behavior profile
 * - Scheduling insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { predictiveAIService } from '@/lib/predictive-ai-service'
import { z } from 'zod'

// Schema de validação
const predictRequestSchema = z.object({
  type: z.enum(['single', 'batch', 'overbooking', 'profile', 'insights']),
  consultationId: z.string().optional(),
  patientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  date: z.string().optional(),
  periodDays: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar permissão (apenas staff)
    const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar previsões' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'insights'

    switch (type) {
      case 'insights': {
        const periodDays = parseInt(searchParams.get('periodDays') || '90')
        
        const insights = await predictiveAIService.getSchedulingInsights(periodDays)
        
        return NextResponse.json({
          success: true,
          data: insights,
          generatedAt: new Date().toISOString()
        })
      }

      case 'single': {
        const consultationId = searchParams.get('consultationId')
        if (!consultationId) {
          return NextResponse.json(
            { error: 'consultationId é obrigatório' },
            { status: 400 }
          )
        }
        
        const prediction = await predictiveAIService.predictNoShow(consultationId)
        
        if (!prediction) {
          return NextResponse.json(
            { error: 'Consulta não encontrada' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: prediction
        })
      }

      case 'profile': {
        const patientId = searchParams.get('patientId')
        if (!patientId) {
          return NextResponse.json(
            { error: 'patientId é obrigatório' },
            { status: 400 }
          )
        }
        
        const profile = await predictiveAIService.getPatientBehaviorProfile(patientId)
        
        if (!profile) {
          return NextResponse.json(
            { error: 'Paciente não encontrado' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: profile
        })
      }

      default:
        return NextResponse.json(
          { error: 'Tipo de consulta inválido' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[PredictiveAI] GET Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar permissão
    const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar previsões' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = predictRequestSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validated.error.errors },
        { status: 400 }
      )
    }

    const { type, consultationId, patientId, startDate, endDate, date, periodDays } = validated.data

    switch (type) {
      case 'batch': {
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate e endDate são obrigatórios para batch' },
            { status: 400 }
          )
        }
        
        const predictions = await predictiveAIService.predictNoShowsBatch(
          new Date(startDate),
          new Date(endDate)
        )
        
        // Resumo por nível de risco
        const summary = {
          total: predictions.length,
          high: predictions.filter(p => p.riskLevel === 'HIGH').length,
          medium: predictions.filter(p => p.riskLevel === 'MEDIUM').length,
          low: predictions.filter(p => p.riskLevel === 'LOW').length,
          avgProbability: predictions.reduce((acc, p) => acc + p.probability, 0) / Math.max(1, predictions.length)
        }
        
        return NextResponse.json({
          success: true,
          summary,
          predictions: predictions.slice(0, 50), // Limitar resposta
          totalPredictions: predictions.length,
          generatedAt: new Date().toISOString()
        })
      }

      case 'overbooking': {
        if (!date) {
          return NextResponse.json(
            { error: 'date é obrigatório para overbooking' },
            { status: 400 }
          )
        }
        
        const recommendations = await predictiveAIService.getOverbookingRecommendations(
          new Date(date)
        )
        
        const totalRecommended = recommendations.reduce((acc, r) => acc + r.recommendedOverbooking, 0)
        
        return NextResponse.json({
          success: true,
          date,
          totalRecommendedOverbooking: totalRecommended,
          recommendations,
          generatedAt: new Date().toISOString()
        })
      }

      case 'profile': {
        if (!patientId) {
          return NextResponse.json(
            { error: 'patientId é obrigatório' },
            { status: 400 }
          )
        }
        
        const profile = await predictiveAIService.getPatientBehaviorProfile(patientId)
        
        if (!profile) {
          return NextResponse.json(
            { error: 'Paciente não encontrado' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: profile,
          generatedAt: new Date().toISOString()
        })
      }

      case 'insights': {
        const insights = await predictiveAIService.getSchedulingInsights(periodDays || 90)
        
        return NextResponse.json({
          success: true,
          data: insights,
          generatedAt: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json(
          { error: 'Tipo de operação inválido' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[PredictiveAI] POST Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
