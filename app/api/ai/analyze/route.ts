import { NextRequest, NextResponse } from 'next/server'
import { MedicalAIService } from '@/lib/ai-service'

export async function POST(req: NextRequest) {
  try {
    const { symptoms, patientHistory, context, analysisType } = await req.json()

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json(
        { error: 'Lista de sintomas é obrigatória' },
        { status: 400 }
      )
    }

    let result

    switch (analysisType) {
      case 'symptoms':
        result = await MedicalAIService.analyzeSymptoms(symptoms, patientHistory, context)
        break
      
      case 'drug_interactions':
        if (!symptoms.every(item => typeof item === 'string')) {
          return NextResponse.json(
            { error: 'Lista de medicamentos deve conter apenas strings' },
            { status: 400 }
          )
        }
        result = await MedicalAIService.checkDrugInteractions(symptoms)
        break
      
      default:
        result = await MedicalAIService.analyzeSymptoms(symptoms, patientHistory, context)
    }

    return NextResponse.json({
      analysis: result,
      timestamp: new Date().toISOString(),
      type: analysisType || 'symptoms'
    })

  } catch (error) {
    console.error('Erro na análise médica:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar análise médica',
        details: 'Verifique os dados enviados e tente novamente' 
      },
      { status: 500 }
    )
  }
}
