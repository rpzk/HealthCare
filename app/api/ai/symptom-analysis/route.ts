import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============ TIPOS ============

interface SymptomAnalysisResult {
  analysis: string
  possibleConditions: Array<{
    name: string
    probability: 'alta' | 'média' | 'baixa'
    description: string
  }>
  suggestions: string[]
  redFlags: string[]
  recommendedTests: string[]
  timestamp: string
}

// ============ BASE DE CONHECIMENTO ============
// Sistema de regras para análise sintomática baseada em evidências
// Em produção, usar modelo de IA médica treinado

interface SymptomRule {
  symptoms: string[]
  minMatch: number
  condition: string
  probability: 'alta' | 'média' | 'baixa'
  description: string
  redFlags?: string[]
  tests?: string[]
}

const SYMPTOM_RULES: SymptomRule[] = [
  // Sistema Respiratório
  {
    symptoms: ['tosse', 'febre', 'dor de garganta', 'coriza', 'espirros'],
    minMatch: 3,
    condition: 'Infecção de vias aéreas superiores (IVAS)',
    probability: 'alta',
    description: 'Quadro viral comum, geralmente autolimitado',
    tests: ['Hemograma', 'Teste rápido de influenza (se epidemia)']
  },
  {
    symptoms: ['tosse', 'febre', 'dispneia', 'dor torácica', 'expectoração'],
    minMatch: 3,
    condition: 'Pneumonia',
    probability: 'média',
    description: 'Infecção do parênquima pulmonar',
    redFlags: ['Saturação < 92%', 'FR > 24', 'Confusão mental', 'Hipotensão'],
    tests: ['Radiografia de tórax', 'Hemograma', 'PCR', 'Gasometria se dispneia']
  },
  {
    symptoms: ['dispneia', 'sibilos', 'tosse', 'aperto no peito'],
    minMatch: 3,
    condition: 'Asma / Broncoespasmo',
    probability: 'alta',
    description: 'Obstrução reversível das vias aéreas',
    tests: ['Espirometria', 'Peak flow']
  },
  
  // Sistema Cardiovascular
  {
    symptoms: ['dor torácica', 'dispneia', 'sudorese', 'náusea', 'irradiação para braço'],
    minMatch: 3,
    condition: 'Síndrome coronariana aguda',
    probability: 'alta',
    description: 'EMERGÊNCIA - Possível infarto do miocárdio',
    redFlags: ['Dor > 20min', 'Sudorese fria', 'Alteração ECG', 'Histórico cardíaco'],
    tests: ['ECG urgente', 'Troponina', 'CKMB', 'Radiografia de tórax']
  },
  {
    symptoms: ['dispneia', 'edema', 'ortopneia', 'fadiga', 'tosse noturna'],
    minMatch: 3,
    condition: 'Insuficiência cardíaca descompensada',
    probability: 'média',
    description: 'Falência da bomba cardíaca',
    redFlags: ['Edema pulmonar', 'Hipotensão', 'Anúria'],
    tests: ['BNP/NT-proBNP', 'Radiografia de tórax', 'Ecocardiograma', 'Função renal']
  },
  {
    symptoms: ['palpitações', 'tontura', 'síncope', 'dispneia'],
    minMatch: 2,
    condition: 'Arritmia cardíaca',
    probability: 'média',
    description: 'Alteração do ritmo cardíaco',
    tests: ['ECG', 'Holter 24h', 'Eletrólitos']
  },
  
  // Sistema Gastrointestinal
  {
    symptoms: ['dor abdominal', 'náusea', 'vômito', 'diarreia', 'febre'],
    minMatch: 3,
    condition: 'Gastroenterite aguda',
    probability: 'alta',
    description: 'Infecção gastrointestinal, geralmente viral',
    redFlags: ['Desidratação grave', 'Sangue nas fezes', 'Febre alta'],
    tests: ['Hemograma', 'Função renal', 'Eletrólitos', 'Coprocultura se prolongado']
  },
  {
    symptoms: ['dor abdominal', 'náusea', 'vômito', 'distensão', 'parada de evacuação'],
    minMatch: 3,
    condition: 'Obstrução intestinal',
    probability: 'média',
    description: 'URGÊNCIA - Bloqueio do trânsito intestinal',
    redFlags: ['Distensão importante', 'Vômitos fecaloides', 'Ausência de RHA'],
    tests: ['Radiografia de abdome', 'Tomografia', 'Hemograma', 'Eletrólitos']
  },
  {
    symptoms: ['dor em fossa ilíaca direita', 'náusea', 'febre', 'anorexia'],
    minMatch: 3,
    condition: 'Apendicite aguda',
    probability: 'alta',
    description: 'URGÊNCIA - Inflamação do apêndice',
    redFlags: ['Peritonite', 'Febre alta', 'Rigidez abdominal'],
    tests: ['Hemograma', 'PCR', 'Ultrassom ou TC de abdome']
  },
  {
    symptoms: ['azia', 'queimação', 'regurgitação', 'dor epigástrica'],
    minMatch: 2,
    condition: 'Doença do refluxo gastroesofágico',
    probability: 'alta',
    description: 'Refluxo de conteúdo gástrico para esôfago',
    tests: ['EDA se sintomas de alarme', 'pHmetria se refratário']
  },
  
  // Sistema Urinário
  {
    symptoms: ['disúria', 'polaciúria', 'urgência miccional', 'dor suprapúbica'],
    minMatch: 3,
    condition: 'Infecção do trato urinário',
    probability: 'alta',
    description: 'Cistite bacteriana',
    tests: ['EAS', 'Urocultura']
  },
  {
    symptoms: ['febre', 'dor lombar', 'disúria', 'calafrios', 'náusea'],
    minMatch: 3,
    condition: 'Pielonefrite',
    probability: 'média',
    description: 'Infecção renal',
    redFlags: ['Sepse', 'Obstrução urinária', 'Imunossupressão'],
    tests: ['EAS', 'Urocultura', 'Hemograma', 'Função renal', 'US renal']
  },
  {
    symptoms: ['cólica lombar', 'dor irradiada', 'hematúria', 'náusea'],
    minMatch: 3,
    condition: 'Nefrolitíase (cólica renal)',
    probability: 'alta',
    description: 'Cálculo urinário',
    tests: ['EAS', 'US de vias urinárias', 'TC sem contraste']
  },
  
  // Sistema Neurológico
  {
    symptoms: ['cefaleia', 'fotofobia', 'náusea', 'aura visual'],
    minMatch: 3,
    condition: 'Migrânea (enxaqueca)',
    probability: 'alta',
    description: 'Cefaleia primária vascular',
    redFlags: ['Cefaleia em trovoada', 'Déficit neurológico', 'Febre']
  },
  {
    symptoms: ['cefaleia', 'rigidez de nuca', 'febre', 'vômitos', 'fotofobia'],
    minMatch: 3,
    condition: 'Meningite',
    probability: 'média',
    description: 'EMERGÊNCIA - Infecção das meninges',
    redFlags: ['Alteração consciência', 'Petéquias', 'Convulsões'],
    tests: ['Punção lombar', 'Hemograma', 'Hemocultura', 'TC crânio']
  },
  {
    symptoms: ['déficit motor', 'déficit sensitivo', 'alteração da fala', 'desvio de rima'],
    minMatch: 2,
    condition: 'Acidente vascular cerebral',
    probability: 'alta',
    description: 'EMERGÊNCIA - AVC isquêmico ou hemorrágico',
    redFlags: ['Início súbito', 'Rebaixamento consciência'],
    tests: ['TC de crânio URGENTE', 'Glicemia', 'Coagulograma']
  },
  
  // Sistema Endócrino
  {
    symptoms: ['poliúria', 'polidipsia', 'perda de peso', 'fadiga', 'visão turva'],
    minMatch: 3,
    condition: 'Diabetes mellitus descompensado',
    probability: 'alta',
    description: 'Hiperglicemia',
    redFlags: ['Cetoacidose', 'Estado hiperosmolar', 'Confusão'],
    tests: ['Glicemia', 'HbA1c', 'Eletrólitos', 'Gasometria se suspeita de CAD']
  },
  {
    symptoms: ['fadiga', 'ganho de peso', 'intolerância ao frio', 'constipação', 'pele seca'],
    minMatch: 3,
    condition: 'Hipotireoidismo',
    probability: 'alta',
    description: 'Função tireoidiana diminuída',
    tests: ['TSH', 'T4 livre']
  },
  {
    symptoms: ['perda de peso', 'tremores', 'taquicardia', 'intolerância ao calor', 'ansiedade'],
    minMatch: 3,
    condition: 'Hipertireoidismo',
    probability: 'alta',
    description: 'Função tireoidiana aumentada',
    tests: ['TSH', 'T4 livre', 'T3']
  },
  
  // Sistema Musculoesquelético
  {
    symptoms: ['dor lombar', 'rigidez matinal', 'limitação movimento', 'irradiação para perna'],
    minMatch: 3,
    condition: 'Lombalgia / Lombociatalgia',
    probability: 'alta',
    description: 'Dor lombar mecânica ou radicular',
    redFlags: ['Déficit neurológico', 'Síndrome da cauda equina', 'Trauma'],
    tests: ['Radiografia', 'Ressonância se red flags']
  },
  
  // Infecções
  {
    symptoms: ['febre', 'calafrios', 'mialgia', 'artralgia', 'cefaleia', 'prostração'],
    minMatch: 4,
    condition: 'Síndrome gripal / Dengue',
    probability: 'média',
    description: 'Infecção viral sistêmica',
    redFlags: ['Sangramento', 'Dor abdominal intensa', 'Vômitos persistentes', 'Hipotensão'],
    tests: ['Hemograma', 'NS1/IgM dengue', 'Plaquetas']
  },
  
  // Psiquiátrico
  {
    symptoms: ['tristeza', 'anedonia', 'insônia', 'fadiga', 'alteração apetite', 'dificuldade concentração'],
    minMatch: 4,
    condition: 'Episódio depressivo',
    probability: 'alta',
    description: 'Transtorno depressivo maior',
    redFlags: ['Ideação suicida', 'Sintomas psicóticos']
  },
  {
    symptoms: ['ansiedade', 'palpitações', 'tremores', 'sudorese', 'medo intenso', 'dispneia'],
    minMatch: 4,
    condition: 'Transtorno de ansiedade / Síndrome do pânico',
    probability: 'alta',
    description: 'Ansiedade patológica'
  }
]

// ============ FUNÇÕES AUXILIARES ============

function normalizeSymptom(symptom: string): string {
  return symptom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function matchSymptoms(patientSymptoms: string[], ruleSymptoms: string[]): number {
  let matches = 0
  const normalizedPatient = patientSymptoms.map(normalizeSymptom)
  
  for (const ruleSymptom of ruleSymptoms) {
    const normalizedRule = normalizeSymptom(ruleSymptom)
    
    const found = normalizedPatient.some(ps => 
      ps.includes(normalizedRule) || normalizedRule.includes(ps)
    )
    
    if (found) matches++
  }
  
  return matches
}

function analyzeSymptoms(symptoms: string[]): SymptomAnalysisResult {
  const possibleConditions: SymptomAnalysisResult['possibleConditions'] = []
  const allRedFlags: string[] = []
  const allTests: string[] = []
  const suggestions: string[] = []
  
  // Verificar cada regra
  for (const rule of SYMPTOM_RULES) {
    const matches = matchSymptoms(symptoms, rule.symptoms)
    
    if (matches >= rule.minMatch) {
      possibleConditions.push({
        name: rule.condition,
        probability: rule.probability,
        description: rule.description
      })
      
      if (rule.redFlags) {
        allRedFlags.push(...rule.redFlags)
      }
      
      if (rule.tests) {
        allTests.push(...rule.tests)
      }
    }
  }
  
  // Ordenar condições por probabilidade
  const probabilityOrder = { alta: 0, média: 1, baixa: 2 }
  possibleConditions.sort((a, b) => probabilityOrder[a.probability] - probabilityOrder[b.probability])
  
  // Gerar análise textual
  let analysis = ''
  
  if (possibleConditions.length === 0) {
    analysis = 'Não foi possível identificar padrões clínicos específicos com os sintomas informados. ' +
      'Recomenda-se avaliação clínica detalhada para investigação adicional.'
  } else {
    analysis = `Com base nos sintomas apresentados (${symptoms.join(', ')}), ` +
      `foram identificadas ${possibleConditions.length} hipótese(s) diagnóstica(s) a considerar. `
    
    if (possibleConditions.some(c => c.probability === 'alta')) {
      analysis += 'Existem condições com alta probabilidade que merecem investigação prioritária. '
    }
    
    if (allRedFlags.length > 0) {
      analysis += 'ATENÇÃO: Verificar presença de sinais de alarme que podem indicar gravidade. '
    }
  }
  
  // Gerar sugestões
  if (possibleConditions.length > 0) {
    suggestions.push('Realizar anamnese detalhada focada nas condições identificadas')
    suggestions.push('Verificar sinais vitais completos')
    
    if (possibleConditions.some(c => c.description.includes('EMERGÊNCIA'))) {
      suggestions.push('ATENÇÃO: Condição potencialmente grave - avaliar necessidade de atendimento imediato')
    }
    
    if (possibleConditions.some(c => c.description.includes('URGÊNCIA'))) {
      suggestions.push('Condição que requer avaliação urgente')
    }
  }
  
  // Remover duplicatas
  const uniqueRedFlags = [...new Set(allRedFlags)]
  const uniqueTests = [...new Set(allTests)]
  
  return {
    analysis,
    possibleConditions: possibleConditions.slice(0, 5), // Limitar a 5 condições
    suggestions,
    redFlags: uniqueRedFlags,
    recommendedTests: uniqueTests,
    timestamp: new Date().toISOString()
  }
}

// ============ SCHEMA DE VALIDAÇÃO ============

const requestSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'Pelo menos um sintoma é necessário'),
  patientId: z.string().optional(),
  includeHistory: z.boolean().optional().default(false)
})

// ============ HANDLER ============

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar role
    const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Validar corpo da requisição
    const body = await request.json()
    const result = requestSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { symptoms, patientId, includeHistory } = result.data

    // Enriquecer com histórico do paciente se solicitado
    let enrichedSymptoms = [...symptoms]
    
    if (includeHistory && patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          medicalHistory: true,
          allergies: true,
          consultations: {
            orderBy: { scheduledDate: 'desc' },
            take: 3,
            select: {
              diagnoses: true,
              chiefComplaint: true
            }
          }
        }
      })
      
      if (patient) {
        // Adicionar contexto do histórico se relevante
        // (em produção, usar NLP mais sofisticado)
      }
    }

    // Realizar análise
    const analysisResult = analyzeSymptoms(enrichedSymptoms)

    return NextResponse.json(analysisResult)

  } catch (error) {
    console.error('Erro na análise de sintomas:', error)
    return NextResponse.json(
      { error: 'Erro ao processar análise de sintomas' },
      { status: 500 }
    )
  }
}
