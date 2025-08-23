import { NextRequest, NextResponse } from 'next/server'
import { MedicalAgentService } from '@/lib/medical-agent'

export async function POST(req: NextRequest) {
  try {
    const { patientId, action, currentSymptoms, currentFindings, context } = await req.json()

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'analyze_history':
        console.log(`🔍 Analisando histórico completo do paciente: ${patientId}`)
        result = await MedicalAgentService.analyzePatientHistory(patientId)
        break

      case 'generate_evolution':
        console.log(`📋 Gerando evolução médica para paciente: ${patientId}`)
        result = await MedicalAgentService.generateEvolutionSuggestion(
          patientId,
          currentSymptoms,
          currentFindings,
          context
        )
        break

      case 'analyze_trends':
        console.log(`📈 Analisando tendências vitais do paciente: ${patientId}`)
        result = await MedicalAgentService.analyzeTrends(patientId)
        break

      case 'gather_data':
        console.log(`📊 Coletando dados completos do paciente: ${patientId}`)
        result = await MedicalAgentService.gatherPatientData(patientId)
        break

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida. Use: analyze_history, generate_evolution, analyze_trends, gather_data' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      action: action,
      patientId: patientId,
      timestamp: new Date().toISOString(),
      message: `Análise ${action} concluída com sucesso`
    })

  } catch (error) {
    console.error(`Erro no agente médico:`, error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro no agente médico',
        details: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
