import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Analisar respostas de um questionário com IA
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar questionário com respostas
    const questionnaire = await prisma.patientQuestionnaire.findUnique({
      where: { id: params.id },
      include: {
        template: {
          include: {
            categories: {
              include: {
                questions: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        },
        answers: {
          include: {
            question: true,
            selectedOption: true
          }
        },
        patient: {
          select: { name: true, birthDate: true, gender: true }
        }
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionário não encontrado' }, { status: 404 })
    }

    if (questionnaire.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Questionário ainda não foi completado' }, { status: 400 })
    }

    // Calcular scores se houver scoring logic
    const scoringLogic = questionnaire.template.scoringLogic as any
    const scores: Record<string, number> = {}

    // Initialize scores based on scoring logic type
    if (scoringLogic?.dimensions) {
      for (const dim of scoringLogic.dimensions) {
        scores[dim] = 0
      }
    }
    
    // For multi-system (universal), initialize all dimensions
    if (scoringLogic?.type === 'multi_system' && scoringLogic?.systems) {
      for (const systemDims of Object.values(scoringLogic.systems) as string[][]) {
        for (const dim of systemDims) {
          scores[dim] = 0
        }
      }
    }

    // Calculate from answers
    for (const answer of questionnaire.answers) {
      // Single choice answer
      if (answer.selectedOption?.scoreValue) {
        const scoreValue = answer.selectedOption.scoreValue as Record<string, number>
        for (const [key, value] of Object.entries(scoreValue)) {
          scores[key] = (scores[key] || 0) + value
        }
      }
      
      // Scale answer - apply score mapping if defined
      if (answer.numericValue !== null && answer.numericValue !== undefined) {
        const question = questionnaire.template.categories
          .flatMap(c => c.questions)
          .find(q => q.id === answer.questionId)
        
        if (question) {
          // Get options to find scoreMapping
          const qData = question as any
          if (qData.scoreMapping) {
            const value = answer.numericValue
            const max = qData.scaleMax || 10
            const mid = max / 2
            
            if (value <= mid - 1) {
              // Low score
              const lowScores = qData.scoreMapping.low as Record<string, number>
              for (const [key, val] of Object.entries(lowScores || {})) {
                scores[key] = (scores[key] || 0) + val
              }
            } else if (value >= mid + 1) {
              // High score
              const highScores = qData.scoreMapping.high as Record<string, number>
              for (const [key, val] of Object.entries(highScores || {})) {
                scores[key] = (scores[key] || 0) + val
              }
            }
          }
        }
      }
      
      // Multiple choice - sum all selected options
      if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
        const question = questionnaire.template.categories
          .flatMap(c => c.questions)
          .find(q => q.id === answer.questionId)
        
        if (question) {
          for (const optId of answer.selectedOptionIds) {
            const opt = question.options.find(o => o.id === optId)
            if (opt?.scoreValue) {
              const sv = opt.scoreValue as Record<string, number>
              for (const [key, value] of Object.entries(sv)) {
                scores[key] = (scores[key] || 0) + value
              }
            }
          }
        }
      }
    }

    // Calculate percentages
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
    const percentages: Record<string, number> = {}
    if (totalScore > 0) {
      for (const [key, value] of Object.entries(scores)) {
        percentages[key] = Math.round((value / totalScore) * 100)
      }
    }

    // Build analysis based on therapeutic system
    let analysis: any = {
      scores,
      percentages,
      totalScore,
      analyzedAt: new Date().toISOString()
    }

    // System-specific analysis
    const system = questionnaire.template.therapeuticSystem

    if (system === 'AYURVEDA' && scores.vata !== undefined) {
      // Determine primary and secondary dosha
      const doshas = [
        { name: 'Vata', score: scores.vata, percent: percentages.vata },
        { name: 'Pitta', score: scores.pitta, percent: percentages.pitta },
        { name: 'Kapha', score: scores.kapha, percent: percentages.kapha }
      ].sort((a, b) => b.score - a.score)

      analysis.primaryDosha = doshas[0].name
      analysis.secondaryDosha = doshas[1].name
      analysis.doshaProfile = doshas

      // Generate recommendations
      analysis.recommendations = generateAyurvedaRecommendations(doshas[0].name, doshas)
    }

    if (system === 'ANTHROPOSOPHY' && scores.sanguine !== undefined) {
      const temperaments = [
        { name: 'Sanguíneo', score: scores.sanguine, percent: percentages.sanguine },
        { name: 'Colérico', score: scores.choleric, percent: percentages.choleric },
        { name: 'Melancólico', score: scores.melancholic, percent: percentages.melancholic },
        { name: 'Fleumático', score: scores.phlegmatic, percent: percentages.phlegmatic }
      ].sort((a, b) => b.score - a.score)

      analysis.primaryTemperament = temperaments[0].name
      analysis.secondaryTemperament = temperaments[1].name
      analysis.temperamentProfile = temperaments

      analysis.recommendations = generateTemperamentRecommendations(temperaments[0].name)
    }

    // UNIVERSAL INTEGRATIVE ANALYSIS - Multi-system analysis
    if (system === 'GENERAL' && scoringLogic?.type === 'multi_system') {
      analysis = generateUniversalAnalysis(scores, questionnaire.answers, questionnaire.template)
    }

    // Format answers for review
    analysis.answersFormatted = questionnaire.answers.map(a => ({
      questionId: a.questionId,
      questionText: a.question.text,
      answer: a.selectedOption?.text || a.textValue || a.numericValue?.toString() || (a.booleanValue ? 'Sim' : 'Não'),
      timeSpent: a.timeSpentSeconds
    }))

    // If custom AI prompt is defined, we would call AI service here
    // For now, just use rule-based analysis above

    // Save analysis
    await prisma.patientQuestionnaire.update({
      where: { id: params.id },
      data: {
        aiAnalysis: analysis,
        aiAnalyzedAt: new Date()
      }
    })

    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('Error analyzing questionnaire:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Obter análise existente
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const questionnaire = await prisma.patientQuestionnaire.findUnique({
      where: { id: params.id },
      select: {
        aiAnalysis: true,
        aiAnalyzedAt: true,
        status: true
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionário não encontrado' }, { status: 404 })
    }

    if (!questionnaire.aiAnalysis) {
      return NextResponse.json({ 
        analyzed: false,
        message: 'Análise ainda não realizada'
      })
    }

    return NextResponse.json({
      analyzed: true,
      analysis: questionnaire.aiAnalysis,
      analyzedAt: questionnaire.aiAnalyzedAt
    })

  } catch (error: any) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper functions for recommendations
function generateAyurvedaRecommendations(primaryDosha: string, doshas: any[]) {
  const recommendations: Record<string, any> = {
    Vata: {
      diet: [
        'Prefira alimentos quentes, oleosos e nutritivos',
        'Evite alimentos frios, secos e crus',
        'Mantenha horários regulares de refeição',
        'Sabores recomendados: doce, ácido, salgado'
      ],
      lifestyle: [
        'Estabeleça uma rotina diária consistente',
        'Pratique atividades calmas como yoga e tai chi',
        'Evite excesso de estímulos e viagens',
        'Durma antes das 22h'
      ],
      therapies: [
        'Massagem com óleo quente (Abhyanga)',
        'Basti (enemas terapêuticos)',
        'Óleos essenciais: lavanda, gengibre, canela'
      ]
    },
    Pitta: {
      diet: [
        'Prefira alimentos frescos e refrescantes',
        'Evite alimentos muito condimentados, ácidos ou fermentados',
        'Coma em ambiente calmo, sem pressa',
        'Sabores recomendados: doce, amargo, adstringente'
      ],
      lifestyle: [
        'Evite excesso de competição e calor',
        'Pratique atividades ao ar livre em horários frescos',
        'Cultive atividades artísticas e contemplativas',
        'Evite conflitos e discussões'
      ],
      therapies: [
        'Massagem com óleo de coco',
        'Virechana (purgação terapêutica)',
        'Óleos essenciais: sândalo, rosa, hortelã'
      ]
    },
    Kapha: {
      diet: [
        'Prefira alimentos leves, secos e quentes',
        'Evite alimentos pesados, oleosos e frios',
        'Faça jejum intermitente ocasional',
        'Sabores recomendados: picante, amargo, adstringente'
      ],
      lifestyle: [
        'Mantenha-se ativo e em movimento',
        'Acorde cedo (antes das 6h)',
        'Pratique exercícios vigorosos',
        'Evite sonecas durante o dia'
      ],
      therapies: [
        'Massagem seca ou com pouco óleo',
        'Nasya (tratamento nasal)',
        'Óleos essenciais: eucalipto, alecrim, cedro'
      ]
    }
  }

  return recommendations[primaryDosha] || {}
}

function generateTemperamentRecommendations(temperament: string) {
  const recommendations: Record<string, any> = {
    'Sanguíneo': {
      strengths: [
        'Otimismo e alegria naturais',
        'Facilidade de comunicação',
        'Adaptabilidade'
      ],
      challenges: [
        'Dificuldade de concentração',
        'Superficialidade',
        'Inconstância'
      ],
      therapeutic: [
        'Atividades que exijam foco prolongado',
        'Práticas de enraizamento',
        'Compromissos de longo prazo'
      ]
    },
    'Colérico': {
      strengths: [
        'Liderança natural',
        'Determinação',
        'Capacidade de iniciativa'
      ],
      challenges: [
        'Impaciência',
        'Tendência à raiva',
        'Dificuldade de delegar'
      ],
      therapeutic: [
        'Práticas de paciência e escuta',
        'Atividades em equipe',
        'Meditação e contemplação'
      ]
    },
    'Melancólico': {
      strengths: [
        'Profundidade e reflexão',
        'Sensibilidade artística',
        'Fidelidade e compromisso'
      ],
      challenges: [
        'Tendência à tristeza',
        'Autocrítica excessiva',
        'Dificuldade de soltar'
      ],
      therapeutic: [
        'Expressão artística',
        'Atividades ao ar livre',
        'Práticas de gratidão'
      ]
    },
    'Fleumático': {
      strengths: [
        'Calma e estabilidade',
        'Paciência',
        'Lealdade'
      ],
      challenges: [
        'Lentidão',
        'Resistência a mudanças',
        'Apatia'
      ],
      therapeutic: [
        'Atividades físicas estimulantes',
        'Desafios novos',
        'Metas com prazos definidos'
      ]
    }
  }

  return recommendations[temperament] || {}
}

// ==========================================
// UNIVERSAL INTEGRATIVE ANALYSIS
// ==========================================
function generateUniversalAnalysis(scores: Record<string, number>, answers: any[], template: any) {
  const analysis: any = {
    analyzedAt: new Date().toISOString(),
    type: 'universal_integrative',
    systems: {}
  }

  // ===== AYURVEDA ANALYSIS =====
  const ayurvedaScores = {
    vata: scores.vata || 0,
    pitta: scores.pitta || 0,
    kapha: scores.kapha || 0
  }
  const ayurvedaTotal = Object.values(ayurvedaScores).reduce((a, b) => a + b, 0)
  
  if (ayurvedaTotal > 0) {
    const doshas = [
      { name: 'Vata', score: ayurvedaScores.vata, percent: Math.round((ayurvedaScores.vata / ayurvedaTotal) * 100), emoji: '💨', element: 'Ar + Éter', qualities: 'Leve, seco, frio, móvel' },
      { name: 'Pitta', score: ayurvedaScores.pitta, percent: Math.round((ayurvedaScores.pitta / ayurvedaTotal) * 100), emoji: '🔥', element: 'Fogo + Água', qualities: 'Quente, intenso, penetrante' },
      { name: 'Kapha', score: ayurvedaScores.kapha, percent: Math.round((ayurvedaScores.kapha / ayurvedaTotal) * 100), emoji: '💧', element: 'Terra + Água', qualities: 'Pesado, lento, estável, úmido' }
    ].sort((a, b) => b.score - a.score)

    analysis.systems.ayurveda = {
      title: '🌿 Ayurveda - Prakriti',
      primary: doshas[0],
      secondary: doshas[1],
      profile: doshas,
      constitution: `${doshas[0].name}-${doshas[1].name}`,
      description: getAyurvedaDescription(doshas[0].name, doshas[1].name),
      recommendations: generateAyurvedaRecommendations(doshas[0].name, doshas)
    }
  }

  // ===== ANTHROPOSOPHY ANALYSIS =====
  const anthropScores = {
    sanguine: scores.sanguine || 0,
    choleric: scores.choleric || 0,
    melancholic: scores.melancholic || 0,
    phlegmatic: scores.phlegmatic || 0
  }
  const anthropTotal = Object.values(anthropScores).reduce((a, b) => a + b, 0)

  if (anthropTotal > 0) {
    const temperaments = [
      { name: 'Sanguíneo', score: anthropScores.sanguine, percent: Math.round((anthropScores.sanguine / anthropTotal) * 100), emoji: '🦋', element: 'Ar', color: '#F59E0B' },
      { name: 'Colérico', score: anthropScores.choleric, percent: Math.round((anthropScores.choleric / anthropTotal) * 100), emoji: '🦁', element: 'Fogo', color: '#DC2626' },
      { name: 'Melancólico', score: anthropScores.melancholic, percent: Math.round((anthropScores.melancholic / anthropTotal) * 100), emoji: '🌙', element: 'Terra', color: '#3B82F6' },
      { name: 'Fleumático', score: anthropScores.phlegmatic, percent: Math.round((anthropScores.phlegmatic / anthropTotal) * 100), emoji: '🐻', element: 'Água', color: '#10B981' }
    ].sort((a, b) => b.score - a.score)

    analysis.systems.anthroposophy = {
      title: '🌟 Antroposofia - Temperamento',
      primary: temperaments[0],
      secondary: temperaments[1],
      profile: temperaments,
      constitution: `${temperaments[0].name} com tendências ${temperaments[1].name}`,
      description: getTemperamentDescription(temperaments[0].name),
      recommendations: generateTemperamentRecommendations(temperaments[0].name)
    }
  }

  // ===== TCM ANALYSIS =====
  const tcmElementScores = {
    wood: scores.wood || 0,
    fire: scores.fire || 0,
    earth: scores.earth || 0,
    metal: scores.metal || 0,
    water: scores.water || 0
  }
  const tcmTotal = Object.values(tcmElementScores).reduce((a, b) => a + b, 0)

  const yinYangScores = {
    yin: scores.yin || 0,
    yang: scores.yang || 0
  }
  const yinYangTotal = yinYangScores.yin + yinYangScores.yang

  if (tcmTotal > 0) {
    const elements = [
      { name: 'Madeira', key: 'wood', score: tcmElementScores.wood, percent: Math.round((tcmElementScores.wood / tcmTotal) * 100), emoji: '🌳', organ: 'Fígado/Vesícula', emotion: 'Raiva', color: '#22C55E' },
      { name: 'Fogo', key: 'fire', score: tcmElementScores.fire, percent: Math.round((tcmElementScores.fire / tcmTotal) * 100), emoji: '🔥', organ: 'Coração/Intestino Delgado', emotion: 'Alegria', color: '#EF4444' },
      { name: 'Terra', key: 'earth', score: tcmElementScores.earth, percent: Math.round((tcmElementScores.earth / tcmTotal) * 100), emoji: '🌍', organ: 'Baço/Estômago', emotion: 'Preocupação', color: '#CA8A04' },
      { name: 'Metal', key: 'metal', score: tcmElementScores.metal, percent: Math.round((tcmElementScores.metal / tcmTotal) * 100), emoji: '⚪', organ: 'Pulmão/Intestino Grosso', emotion: 'Tristeza', color: '#9CA3AF' },
      { name: 'Água', key: 'water', score: tcmElementScores.water, percent: Math.round((tcmElementScores.water / tcmTotal) * 100), emoji: '💧', organ: 'Rim/Bexiga', emotion: 'Medo', color: '#3B82F6' }
    ].sort((a, b) => b.score - a.score)

    const yinYangBalance = yinYangTotal > 0 
      ? { yin: Math.round((yinYangScores.yin / yinYangTotal) * 100), yang: Math.round((yinYangScores.yang / yinYangTotal) * 100) }
      : { yin: 50, yang: 50 }

    analysis.systems.tcm = {
      title: '☯️ MTC - Cinco Elementos',
      primaryElement: elements[0],
      secondaryElement: elements[1],
      weakestElement: elements[elements.length - 1],
      profile: elements,
      yinYang: yinYangBalance,
      yinYangStatus: getYinYangStatus(yinYangBalance),
      constitution: `${elements[0].name} com ${yinYangBalance.yin > yinYangBalance.yang ? 'tendência Yin' : 'tendência Yang'}`,
      description: getTCMDescription(elements[0].name, yinYangBalance),
      recommendations: generateTCMRecommendations(elements[0].name, elements[elements.length - 1].name, yinYangBalance)
    }
  }

  // ===== HOMEOPATHY ANALYSIS =====
  const homeoScores = {
    hot: scores.hot || 0,
    cold: scores.cold || 0,
    dry: scores.dry || 0,
    wet: scores.wet || 0
  }
  const homeoTotal = Object.values(homeoScores).reduce((a, b) => a + b, 0)

  if (homeoTotal > 0) {
    const thermal = homeoScores.hot > homeoScores.cold ? 'Calorento' : 'Friorento'
    const humidity = homeoScores.wet > homeoScores.dry ? 'Úmido' : 'Seco'

    analysis.systems.homeopathy = {
      title: '🌸 Homeopatia - Modalidades',
      thermalType: thermal,
      humidityType: humidity,
      modalities: {
        thermal: { hot: homeoScores.hot, cold: homeoScores.cold, primary: thermal },
        humidity: { wet: homeoScores.wet, dry: homeoScores.dry, primary: humidity }
      },
      constitution: `${thermal} e ${humidity}`,
      description: getHomeopathyDescription(thermal, humidity),
      recommendations: generateHomeopathyRecommendations(thermal, humidity)
    }
  }

  // ===== INTEGRATED SYNTHESIS =====
  analysis.synthesis = generateIntegratedSynthesis(analysis.systems)

  // ===== PRACTICAL RECOMMENDATIONS =====
  analysis.practicalRecommendations = generatePracticalRecommendations(analysis.systems)

  return analysis
}

// Helper descriptions
function getAyurvedaDescription(primary: string, secondary: string): string {
  const descriptions: Record<string, string> = {
    'Vata': 'Constituição leve e criativa, com energia de movimento. Quando em equilíbrio: entusiasta, criativo, flexível. Em desequilíbrio: ansiedade, insônia, digestão irregular.',
    'Pitta': 'Constituição de transformação e metabolismo intenso. Quando em equilíbrio: inteligente, determinado, líder. Em desequilíbrio: irritabilidade, inflamações, problemas de pele.',
    'Kapha': 'Constituição estável e nutritiva, com energia de coesão. Quando em equilíbrio: calmo, leal, resistente. Em desequilíbrio: letargia, ganho de peso, congestão.'
  }
  return descriptions[primary] || ''
}

function getTemperamentDescription(temperament: string): string {
  const descriptions: Record<string, string> = {
    'Sanguíneo': 'Temperamento alegre e comunicativo, vive intensamente o presente. Possui facilidade para se conectar com pessoas, mas pode ter dificuldade de aprofundamento.',
    'Colérico': 'Temperamento de ação e liderança, orientado para objetivos. Possui grande força de vontade, mas precisa trabalhar a paciência e a escuta.',
    'Melancólico': 'Temperamento profundo e reflexivo, com grande sensibilidade. Possui capacidade única de perceber nuances, mas pode tender à tristeza.',
    'Fleumático': 'Temperamento calmo e estável, com grande capacidade de observação. Possui paciência natural, mas pode precisar de estímulo para ação.'
  }
  return descriptions[temperament] || ''
}

function getTCMDescription(element: string, yinYang: { yin: number, yang: number }): string {
  const elementDescriptions: Record<string, string> = {
    'Madeira': 'Energia de crescimento e expansão, relacionada à visão e planejamento.',
    'Fogo': 'Energia de transformação e consciência, relacionada à alegria e comunicação.',
    'Terra': 'Energia de nutrição e centralizacao, relacionada ao pensamento e digestão.',
    'Metal': 'Energia de condensação e discernimento, relacionada à respiração e eliminação.',
    'Água': 'Energia de preservação e profundidade, relacionada à vontade e vitalidade.'
  }
  const balance = yinYang.yin > yinYang.yang + 10 ? 'com tendência a deficiência de Yang' : 
                  yinYang.yang > yinYang.yin + 10 ? 'com tendência a excesso de Yang' : 
                  'com relativo equilíbrio Yin-Yang'
  return `${elementDescriptions[element] || ''} Apresenta ${balance}.`
}

function getYinYangStatus(balance: { yin: number, yang: number }): string {
  const diff = Math.abs(balance.yin - balance.yang)
  if (diff <= 10) return 'Equilibrado'
  if (balance.yin > balance.yang) return diff > 20 ? 'Deficiência de Yang' : 'Tendência Yin'
  return diff > 20 ? 'Excesso de Yang' : 'Tendência Yang'
}

function getHomeopathyDescription(thermal: string, humidity: string): string {
  const profiles: Record<string, string> = {
    'Calorento-Seco': 'Constituição que melhora com frio e ambientes frescos. Tendência a inflamações e secura de mucosas.',
    'Calorento-Úmido': 'Constituição que melhora com frio e ar seco. Tendência a transpiração e processos congestivos quentes.',
    'Friorento-Seco': 'Constituição que melhora com calor e umidade. Tendência a rigidez e ressecamento.',
    'Friorento-Úmido': 'Constituição que melhora com calor e ambiente seco. Tendência a congestões frias e retenção.'
  }
  return profiles[`${thermal}-${humidity}`] || ''
}

// TCM Recommendations
function generateTCMRecommendations(primaryElement: string, weakElement: string, yinYang: { yin: number, yang: number }) {
  const elementRecs: Record<string, any> = {
    'Madeira': {
      diet: ['Vegetais verdes folhosos', 'Alimentos ácidos moderados', 'Chás de menta e camomila'],
      lifestyle: ['Exercícios de alongamento', 'Práticas para expressar emoções', 'Contato com natureza'],
      points: ['F3 (Taichong)', 'VB34 (Yanglingquan)']
    },
    'Fogo': {
      diet: ['Alimentos amargos (rúcula, agrião)', 'Chá verde', 'Evitar estimulantes'],
      lifestyle: ['Meditação', 'Atividades artísticas', 'Práticas de gratidão'],
      points: ['C7 (Shenmen)', 'PC6 (Neiguan)']
    },
    'Terra': {
      diet: ['Alimentos amarelos/laranja (abóbora, cenoura)', 'Gengibre', 'Refeições regulares'],
      lifestyle: ['Canto e música', 'Cultivo de jardim', 'Aterramento'],
      points: ['E36 (Zusanli)', 'BP6 (Sanyinjiao)']
    },
    'Metal': {
      diet: ['Alimentos brancos (pera, rabanete)', 'Alimentos picantes moderados', 'Caldos nutritivos'],
      lifestyle: ['Exercícios respiratórios', 'Organização e desapego', 'Artes marciais'],
      points: ['P7 (Lieque)', 'IG4 (Hegu)']
    },
    'Água': {
      diet: ['Alimentos escuros (feijão preto, gergelim)', 'Frutos do mar', 'Alimentos salgados moderados'],
      lifestyle: ['Descanso adequado', 'Tai Chi', 'Meditação de visualização'],
      points: ['R3 (Taixi)', 'R7 (Fuliu)']
    }
  }

  const recs = elementRecs[primaryElement] || { diet: [], lifestyle: [], points: [] }
  
  // Add Yin-Yang specific recommendations
  if (yinYang.yin > yinYang.yang + 15) {
    recs.yinYangBalance = ['Aumentar atividade física', 'Alimentos quentes e yang', 'Banhos de sol matinal']
  } else if (yinYang.yang > yinYang.yin + 15) {
    recs.yinYangBalance = ['Práticas calmantes', 'Alimentos frescos e yin', 'Descanso adequado']
  }

  return recs
}

// Homeopathy Recommendations
function generateHomeopathyRecommendations(thermal: string, humidity: string) {
  const recs: any = {
    thermal: thermal === 'Calorento' 
      ? ['Ambientes frescos e arejados', 'Evitar alimentos muito quentes', 'Banhos frios ou mornos']
      : ['Manter-se aquecido', 'Alimentos cozidos e quentes', 'Evitar bebidas geladas'],
    humidity: humidity === 'Seco'
      ? ['Hidratação adequada', 'Óleos nutritivos', 'Umidificador de ambiente']
      : ['Evitar excesso de laticínios', 'Alimentos leves', 'Exercício regular'],
    constitutionalRemedies: getConstitutionalRemedies(thermal, humidity)
  }
  return recs
}

function getConstitutionalRemedies(thermal: string, humidity: string): string[] {
  const remedies: Record<string, string[]> = {
    'Calorento-Seco': ['Sulphur', 'Lycopodium', 'Nux vomica'],
    'Calorento-Úmido': ['Pulsatilla', 'Mercurius', 'Lachesis'],
    'Friorento-Seco': ['Arsenicum album', 'Silicea', 'Natrum muriaticum'],
    'Friorento-Úmido': ['Calcarea carbonica', 'Thuja', 'Dulcamara']
  }
  return remedies[`${thermal}-${humidity}`] || []
}

// Integrated Synthesis
function generateIntegratedSynthesis(systems: any) {
  const synthesis: any = {
    convergentPatterns: [],
    keyInsights: [],
    primaryProfile: ''
  }

  // Find convergent patterns
  if (systems.ayurveda && systems.anthroposophy) {
    // Vata-Sanguine correlation
    if (systems.ayurveda.primary.name === 'Vata' && systems.anthroposophy.primary.name === 'Sanguíneo') {
      synthesis.convergentPatterns.push('Padrão Ar/Movimento confirmado em múltiplos sistemas (Vata + Sanguíneo)')
    }
    // Pitta-Choleric correlation
    if (systems.ayurveda.primary.name === 'Pitta' && systems.anthroposophy.primary.name === 'Colérico') {
      synthesis.convergentPatterns.push('Padrão Fogo/Transformação confirmado em múltiplos sistemas (Pitta + Colérico)')
    }
    // Kapha-Phlegmatic correlation
    if (systems.ayurveda.primary.name === 'Kapha' && systems.anthroposophy.primary.name === 'Fleumático') {
      synthesis.convergentPatterns.push('Padrão Terra-Água/Estabilidade confirmado em múltiplos sistemas (Kapha + Fleumático)')
    }
  }

  if (systems.tcm && systems.ayurveda) {
    // Fire element + Pitta
    if (systems.tcm.primaryElement.key === 'fire' && systems.ayurveda.primary.name === 'Pitta') {
      synthesis.convergentPatterns.push('Elemento Fogo dominante confirmado (MTC Fogo + Pitta)')
    }
    // Water element + Kapha
    if (systems.tcm.primaryElement.key === 'water' && systems.ayurveda.primary.name === 'Kapha') {
      synthesis.convergentPatterns.push('Elemento Água dominante confirmado (MTC Água + Kapha)')
    }
  }

  if (systems.homeopathy && systems.ayurveda) {
    // Thermal consistency
    if (systems.homeopathy.thermalType === 'Calorento' && systems.ayurveda.primary.name === 'Pitta') {
      synthesis.convergentPatterns.push('Constituição quente confirmada (Calorento + Pitta)')
    }
    if (systems.homeopathy.thermalType === 'Friorento' && (systems.ayurveda.primary.name === 'Vata' || systems.ayurveda.primary.name === 'Kapha')) {
      synthesis.convergentPatterns.push('Constituição fria confirmada (Friorento + Vata/Kapha)')
    }
  }

  // Generate primary profile description
  const profiles = []
  if (systems.ayurveda) profiles.push(systems.ayurveda.constitution)
  if (systems.anthroposophy) profiles.push(systems.anthroposophy.primary.name)
  if (systems.tcm) profiles.push(systems.tcm.primaryElement.name)
  
  synthesis.primaryProfile = profiles.join(' | ')

  // Key insights
  if (synthesis.convergentPatterns.length >= 2) {
    synthesis.keyInsights.push('Alta consistência entre sistemas - perfil bem definido')
  }
  if (systems.tcm?.yinYangStatus === 'Deficiência de Yang') {
    synthesis.keyInsights.push('Atenção para deficiência de energia vital - priorizar aquecimento e tonificação')
  }
  if (systems.tcm?.yinYangStatus === 'Excesso de Yang') {
    synthesis.keyInsights.push('Atenção para excesso de calor/atividade - priorizar resfriamento e relaxamento')
  }

  return synthesis
}

// Practical Recommendations
function generatePracticalRecommendations(systems: any) {
  const recs: any = {
    morning: [],
    diet: [],
    exercise: [],
    evening: [],
    therapies: []
  }

  // Aggregate recommendations from all systems
  if (systems.ayurveda?.recommendations) {
    recs.diet.push(...(systems.ayurveda.recommendations.diet || []).slice(0, 2))
    recs.therapies.push(...(systems.ayurveda.recommendations.therapies || []).slice(0, 2))
  }
  if (systems.tcm?.recommendations) {
    recs.diet.push(...(systems.tcm.recommendations.diet || []).slice(0, 2))
    recs.exercise.push(...(systems.tcm.recommendations.lifestyle || []).slice(0, 2))
  }
  if (systems.anthroposophy?.recommendations) {
    recs.therapies.push(...(systems.anthroposophy.recommendations.therapeutic || []).slice(0, 2))
  }

  // Morning routine based on constitution
  if (systems.ayurveda?.primary?.name === 'Kapha') {
    recs.morning = ['Acordar antes das 6h', 'Exercício vigoroso pela manhã', 'Tomar água morna com limão']
  } else if (systems.ayurveda?.primary?.name === 'Vata') {
    recs.morning = ['Despertar suave com rotina consistente', 'Auto-massagem com óleo quente', 'Café da manhã nutritivo']
  } else if (systems.ayurveda?.primary?.name === 'Pitta') {
    recs.morning = ['Evitar pressa ao acordar', 'Exercício moderado em horário fresco', 'Café da manhã fresco e nutritivo']
  }

  // Evening routine
  if (systems.anthroposophy?.primary?.name === 'Sanguíneo') {
    recs.evening = ['Práticas de enraizamento', 'Reduzir estímulos 2h antes de dormir', 'Diário de gratidão']
  } else if (systems.anthroposophy?.primary?.name === 'Melancólico') {
    recs.evening = ['Atividades artísticas relaxantes', 'Evitar notícias negativas', 'Preparar ambiente acolhedor']
  } else {
    recs.evening = ['Jantar leve até 19h', 'Desconectar de telas', 'Prática de relaxamento']
  }

  // Remove duplicates
  for (const key of Object.keys(recs)) {
    recs[key] = [...new Set(recs[key])]
  }

  return recs
}
