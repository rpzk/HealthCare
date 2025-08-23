import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { message, type } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Contexto médico personalizado baseado no tipo
    let systemPrompt = ''
    
    switch (type) {
      case 'medical_consultation':
        systemPrompt = `Você é um assistente médico especializado com conhecimento em:
- Diagnóstico diferencial baseado em sintomas
- Análise de exames laboratoriais e de imagem
- Prescrição e interações medicamentosas
- Protocolos clínicos atualizados
- Medicina baseada em evidências

IMPORTANTE: 
- Sempre inclua disclaimers sobre a necessidade de avaliação médica presencial
- Base suas respostas em literatura médica reconhecida
- Se não souber algo, seja honesto sobre as limitações
- Priorize a segurança do paciente em todas as recomendações
- Use terminologia médica adequada mas acessível

Responda de forma estruturada, clara e profissional.`
        break
      
      case 'symptom_analysis':
        systemPrompt = `Você é um especialista em análise de sintomas. Ao analisar sintomas:
- Liste possíveis diagnósticos por ordem de probabilidade
- Inclua diagnósticos diferenciais importantes
- Sugira exames complementares necessários
- Identifique sinais de alerta (red flags)
- Forneça orientações para acompanhamento

Sempre inclua o disclaimer sobre avaliação médica presencial.`
        break
      
      case 'drug_interaction':
        systemPrompt = `Você é um farmacologista clínico especialista em interações medicamentosas:
- Analise interações graves, moderadas e leves
- Explique mecanismos de interação quando relevante
- Sugira alternativas terapêuticas se necessário
- Indique necessidade de monitoramento específico
- Forneça recomendações de ajuste de dose quando aplicável`
        break
      
      default:
        systemPrompt = `Você é um assistente médico geral. Forneça informações médicas precisas, sempre com os devidos disclaimers sobre a necessidade de avaliação médica profissional.`
    }

    const fullPrompt = `${systemPrompt}

Pergunta do usuário: ${message}

Por favor, responda de forma profissional e detalhada:`

    const result = await model.generateContent(fullPrompt)
    const response = result.response.text()

    return NextResponse.json({
      response: response,
      type: type,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro na API do Google AI:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor de IA',
        details: 'Verifique a configuração da API do Google AI Studio' 
      },
      { status: 500 }
    )
  }
}
