import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getAIConfig, aiClient } from '@/lib/ai-client'

// Tipos das sugestões (prescrições, exames, encaminhamentos)
type PrescriptionSuggestion = {
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  reasoning: string
}
type ExamSuggestion = { examType: string; description: string; priority: 'HIGH' | 'NORMAL'; reasoning: string }
type ReferralSuggestion = { specialty: string; description: string; priority: 'HIGH' | 'NORMAL'; reasoning: string }

/** Extrai JSON de uma resposta que pode vir dentro de ```json ... ``` */
function extractJsonFromResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]
  const toParse = jsonBlock ?? trimmed
  try {
    return JSON.parse(toParse) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Chama a IA (Groq/Ollama) para sugerir tratamento, incluindo fitoterapia, homeopatia, florais quando apropriado */
async function getLLMSuggestions(params: {
  fullText: string
  patientAge?: number
  patientSex?: string
}): Promise<{ prescriptions: PrescriptionSuggestion[]; exams: ExamSuggestion[]; referrals: ReferralSuggestion[] }> {
  const config = await getAIConfig()
  const hasCloud = config.provider === 'groq' && config.groqApiKey
  const hasLocal = config.provider === 'ollama'
  if (!hasCloud && !hasLocal) return { prescriptions: [], exams: [], referrals: [] }

  const userPrompt = `Analise o seguinte resumo clínico e sugira tratamento quando apropriado.

TEXTO (SOAP / anamnese):
${params.fullText.slice(0, 4000)}

DADOS: Idade ${params.patientAge ?? 'não informada'}, Sexo ${params.patientSex ?? 'não informado'}.

INSTRUÇÕES:
- Você pode sugerir medicamentos convencionais (alopáticos), fitoterapia (plantas medicinais), fitoterapia chinesa, florais (ex.: Bach, Australian Bush), homeopatia e outras terapias complementares quando fizerem sentido para o caso.
- Para cada prescrição retorne: medication (nome completo do produto ou princípio ativo, ex.: "Arnica montana 6CH", "Floral Rescue", "Valeriana officinalis"), dosage, frequency, duration, instructions, reasoning.
- Retorne APENAS um JSON válido, sem texto antes ou depois, no formato:
{"prescriptions":[{"medication":"...","dosage":"...","frequency":"...","duration":"...","instructions":"...","reasoning":"..."}],"exams":[{"examType":"...","description":"...","priority":"HIGH ou NORMAL","reasoning":"..."}],"referrals":[{"specialty":"...","description":"...","priority":"HIGH ou NORMAL","reasoning":"..."}]}
- Se não houver sugestão de um tipo, use array vazio [].
- Máximo 8 prescrições, 5 exames, 3 encaminhamentos. Seja objetivo.`

  try {
    const response = await aiClient.chat({
      messages: [
        { role: 'system', content: 'Você é um assistente clínico. Responda somente com JSON válido no formato solicitado. Não use markdown nem texto extra.' },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2048,
      temperature: 0.3,
      skipAnonymization: true
    })
    const parsed = extractJsonFromResponse(response.content)
    if (!parsed || typeof parsed.prescriptions !== 'object' || !Array.isArray(parsed.prescriptions)) {
      return { prescriptions: [], exams: [], referrals: [] }
    }
    const prescriptions = (parsed.prescriptions as unknown[]).filter(
      (p): p is PrescriptionSuggestion =>
        p != null &&
        typeof (p as Record<string, unknown>).medication === 'string' &&
        typeof (p as Record<string, unknown>).dosage === 'string'
    ).map(p => ({
      medication: String(p.medication),
      dosage: String(p.dosage ?? ''),
      frequency: String(p.frequency ?? ''),
      duration: String(p.duration ?? ''),
      instructions: String(p.instructions ?? ''),
      reasoning: String(p.reasoning ?? '')
    }))
    const exams = Array.isArray(parsed.exams)
      ? (parsed.exams as unknown[]).filter(
          (e): e is ExamSuggestion =>
            e != null &&
            typeof (e as Record<string, unknown>).examType === 'string' &&
            typeof (e as Record<string, unknown>).description === 'string'
        ).map(e => ({
          examType: String(e.examType),
          description: String(e.description),
          priority: (e.priority === 'HIGH' ? 'HIGH' : 'NORMAL') as 'HIGH' | 'NORMAL',
          reasoning: String(e.reasoning ?? '')
        }))
      : []
    const referrals = Array.isArray(parsed.referrals)
      ? (parsed.referrals as unknown[]).filter(
          (r): r is ReferralSuggestion =>
            r != null &&
            typeof (r as Record<string, unknown>).specialty === 'string' &&
            typeof (r as Record<string, unknown>).description === 'string'
        ).map(r => ({
          specialty: String(r.specialty),
          description: String(r.description),
          priority: (r.priority === 'HIGH' ? 'HIGH' : 'NORMAL') as 'HIGH' | 'NORMAL',
          reasoning: String(r.reasoning ?? '')
        }))
      : []
    return { prescriptions, exams, referrals }
  } catch (err) {
    logger.warn({ err }, 'Sugestão de tratamento por IA falhou; usando apenas regras estáticas')
    return { prescriptions: [], exams: [], referrals: [] }
  }
}

// Banco de conhecimento clínico simplificado para sugestões
// Em produção, isso seria substituído por um LLM real (GPT-4, Claude, etc.)
const CLINICAL_RULES: {
  conditions: RegExp
  suggestions: {
    prescriptions: Array<{
      medication: string
      dosage: string
      frequency: string
      duration: string
      instructions: string
      reasoning: string
    }>
    exams: Array<{
      examType: string
      description: string
      priority: 'HIGH' | 'NORMAL'
      reasoning: string
    }>
    referrals: Array<{
      specialty: string
      description: string
      priority: 'HIGH' | 'NORMAL'
      reasoning: string
    }>
  }
}[] = [
  // Hipertensão
  {
    conditions: /hipertens[ãa]o|press[ãa]o\s+alta|pa\s*=?\s*1[4-9]\d|pa\s*=?\s*[2-9]\d{2}/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Losartana',
          dosage: '50mg',
          frequency: '1x ao dia',
          duration: 'Uso contínuo',
          instructions: 'Tomar pela manhã em jejum',
          reasoning: 'BRA de primeira linha para hipertensão'
        },
        {
          medication: 'Hidroclorotiazida',
          dosage: '25mg',
          frequency: '1x ao dia',
          duration: 'Uso contínuo',
          instructions: 'Tomar pela manhã',
          reasoning: 'Diurético tiazídico para potencializar controle pressórico'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Função renal (ureia, creatinina), eletrólitos',
          priority: 'HIGH',
          reasoning: 'Avaliação de lesão de órgão-alvo e baseline para IECA/BRA'
        },
        {
          examType: 'ECG',
          description: 'Eletrocardiograma de repouso',
          priority: 'NORMAL',
          reasoning: 'Avaliação de HVE e alterações isquêmicas'
        }
      ],
      referrals: [
        {
          specialty: 'Cardiologia',
          description: 'Avaliação cardiológica para estratificação de risco',
          priority: 'NORMAL',
          reasoning: 'Estratificação cardiovascular em hipertenso'
        }
      ]
    }
  },
  // Diabetes
  {
    conditions: /diabet(es|ico)|glicemia\s*(jejum|capilar)?\s*[>:]?\s*([12]\d{2}|[89]\d)|hba1c\s*[>:]?\s*[789]/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Metformina',
          dosage: '850mg',
          frequency: '2x ao dia',
          duration: 'Uso contínuo',
          instructions: 'Tomar junto com as refeições principais',
          reasoning: 'Primeira linha para DM2, sensibilizador de insulina'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Hemoglobina Glicada (HbA1c)',
          priority: 'HIGH',
          reasoning: 'Avaliação de controle glicêmico dos últimos 3 meses'
        },
        {
          examType: 'LABORATORY',
          description: 'Perfil lipídico completo',
          priority: 'NORMAL',
          reasoning: 'Avaliação de risco cardiovascular associado'
        },
        {
          examType: 'LABORATORY',
          description: 'Microalbuminúria em amostra isolada',
          priority: 'NORMAL',
          reasoning: 'Rastreamento de nefropatia diabética'
        }
      ],
      referrals: [
        {
          specialty: 'Oftalmologia',
          description: 'Fundoscopia para rastreamento de retinopatia diabética',
          priority: 'NORMAL',
          reasoning: 'Screening anual obrigatório de retinopatia'
        }
      ]
    }
  },
  // Infecção respiratória / IVAS
  {
    conditions: /tosse|resfria|gripe|coriza|espirr|congest[ãa]o\s+nasal|dor\s+de\s+garganta|odinofagia|IVAS/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Paracetamol',
          dosage: '750mg',
          frequency: '6/6h se febre ou dor',
          duration: '5 dias',
          instructions: 'Não exceder 4g/dia',
          reasoning: 'Analgésico e antipirético sintomático'
        },
        {
          medication: 'Loratadina',
          dosage: '10mg',
          frequency: '1x ao dia',
          duration: '5 dias',
          instructions: 'Tomar à noite',
          reasoning: 'Anti-histamínico para rinorreia e prurido'
        }
      ],
      exams: [],
      referrals: []
    }
  },
  // Infecção urinária
  {
    conditions: /dis[uú]ria|ardência\s+(para\s+)?urinar|urinar\s+frequen|polaciu|infec[çc][ãa]o\s+urin|ITU|cistite/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Nitrofurantoína',
          dosage: '100mg',
          frequency: '6/6h',
          duration: '5 dias',
          instructions: 'Tomar com alimentos',
          reasoning: 'Antibiótico de primeira linha para ITU não-complicada'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Urina I (EAS) + Urocultura com antibiograma',
          priority: 'HIGH',
          reasoning: 'Confirmação diagnóstica e sensibilidade bacteriana'
        }
      ],
      referrals: []
    }
  },
  // Dor lombar
  {
    conditions: /dor\s+(na\s+)?lombar|lombalgia|coluna\s+lombar|dor\s+nas\s+costas/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Dipirona',
          dosage: '1g',
          frequency: '6/6h se dor',
          duration: '5 dias',
          instructions: 'Não usar se alergia prévia',
          reasoning: 'Analgésico para dor aguda'
        },
        {
          medication: 'Ciclobenzaprina',
          dosage: '5mg',
          frequency: '8/8h',
          duration: '5 dias',
          instructions: 'Pode causar sonolência',
          reasoning: 'Relaxante muscular para espasmo associado'
        }
      ],
      exams: [
        {
          examType: 'IMAGING',
          description: 'Radiografia de coluna lombar AP + Perfil',
          priority: 'NORMAL',
          reasoning: 'Avaliação de alterações degenerativas e alinhamento'
        }
      ],
      referrals: []
    }
  },
  // Ansiedade
  {
    conditions: /ansied|nervos|pânico|palpit|insônia|angústia|preocupa[çc][ãa]o\s+excess/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Sertralina',
          dosage: '50mg',
          frequency: '1x ao dia',
          duration: '6 meses mínimo',
          instructions: 'Tomar pela manhã com alimentos. Início gradual.',
          reasoning: 'ISRS de primeira linha para transtorno de ansiedade'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'TSH, T4 livre',
          priority: 'NORMAL',
          reasoning: 'Exclusão de causa orgânica (tireoidopatia)'
        }
      ],
      referrals: [
        {
          specialty: 'Psiquiatria',
          description: 'Avaliação psiquiátrica para manejo especializado',
          priority: 'NORMAL',
          reasoning: 'Acompanhamento especializado para ajuste medicamentoso'
        },
        {
          specialty: 'Psicologia',
          description: 'Psicoterapia cognitivo-comportamental',
          priority: 'NORMAL',
          reasoning: 'TCC é tratamento de primeira linha associado a medicação'
        }
      ]
    }
  },
  // Dislipidemia
  {
    conditions: /colesterol\s+alto|triglicerid|LDL|dislipid|hipercolesterol/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Sinvastatina',
          dosage: '20mg',
          frequency: '1x ao dia à noite',
          duration: 'Uso contínuo',
          instructions: 'Tomar à noite após o jantar',
          reasoning: 'Estatina para controle lipídico'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Perfil lipídico completo (CT, HDL, LDL, TG)',
          priority: 'NORMAL',
          reasoning: 'Avaliação de resposta terapêutica'
        },
        {
          examType: 'LABORATORY',
          description: 'TGO, TGP, CPK',
          priority: 'NORMAL',
          reasoning: 'Baseline para monitoramento de efeitos adversos'
        }
      ],
      referrals: []
    }
  },
  // Pré-natal
  {
    conditions: /gestante|grávida|gravidez|pré-?natal|amenorr|atraso\s+menstr/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Sulfato Ferroso',
          dosage: '40mg Fe elementar',
          frequency: '1x ao dia',
          duration: 'Durante toda gestação',
          instructions: 'Tomar em jejum com suco de laranja',
          reasoning: 'Suplementação profilática de ferro na gestação'
        },
        {
          medication: 'Ácido Fólico',
          dosage: '5mg',
          frequency: '1x ao dia',
          duration: 'Primeiro trimestre',
          instructions: 'Prevenção de defeitos do tubo neural',
          reasoning: 'Suplementação obrigatória no primeiro trimestre'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Hemograma, tipagem sanguínea, Coombs indireto',
          priority: 'HIGH',
          reasoning: 'Exames de rotina do primeiro trimestre'
        },
        {
          examType: 'LABORATORY',
          description: 'Glicemia jejum, TOTG 75g',
          priority: 'HIGH',
          reasoning: 'Rastreamento de diabetes gestacional'
        },
        {
          examType: 'LABORATORY',
          description: 'Sorologias (HIV, VDRL, HBsAg, Anti-HCV, Toxoplasmose, Rubéola)',
          priority: 'HIGH',
          reasoning: 'Rastreamento de infecções verticais'
        },
        {
          examType: 'IMAGING',
          description: 'Ultrassonografia obstétrica',
          priority: 'HIGH',
          reasoning: 'Datação gestacional e viabilidade'
        }
      ],
      referrals: [
        {
          specialty: 'Obstetrícia',
          description: 'Acompanhamento pré-natal de alto risco se indicado',
          priority: 'NORMAL',
          reasoning: 'Referência se gestação de risco'
        }
      ]
    }
  },
  // Gastrite / dispepsia
  {
    conditions: /gastrit|queima[çc][ãa]o|azia|epigástr|dispepsia|reflux|pirose/i,
    suggestions: {
      prescriptions: [
        {
          medication: 'Omeprazol',
          dosage: '20mg',
          frequency: '1x ao dia em jejum',
          duration: '4-8 semanas',
          instructions: 'Tomar 30 min antes do café da manhã',
          reasoning: 'IBP para supressão ácida'
        }
      ],
      exams: [
        {
          examType: 'LABORATORY',
          description: 'Pesquisa de H. pylori (antígeno fecal ou teste respiratório)',
          priority: 'NORMAL',
          reasoning: 'Investigação de infecção por H. pylori'
        }
      ],
      referrals: [
        {
          specialty: 'Gastroenterologia',
          description: 'EDA se sinais de alarme ou refratariedade',
          priority: 'NORMAL',
          reasoning: 'Investigação endoscópica se não responder ao tratamento'
        }
      ]
    }
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { soap, patientAge, patientSex, patientHistory } = body

    // Combinar todo o texto para análise
    const fullText = [
      soap?.subjective || '',
      soap?.objective || '',
      soap?.assessment || '',
      soap?.plan || '',
      patientHistory || ''
    ].join(' ').toLowerCase()

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: 'Conteúdo insuficiente para análise' },
        { status: 400 }
      )
    }

    // Encontrar regras aplicáveis
    const applicableRules = CLINICAL_RULES.filter(rule => 
      rule.conditions.test(fullText)
    )

    // Agregar sugestões de todas as regras aplicáveis
    const aggregatedSuggestions = {
      prescriptions: [] as typeof CLINICAL_RULES[0]['suggestions']['prescriptions'],
      exams: [] as typeof CLINICAL_RULES[0]['suggestions']['exams'],
      referrals: [] as typeof CLINICAL_RULES[0]['suggestions']['referrals']
    }

    const addedMedications = new Set<string>()
    const addedExams = new Set<string>()
    const addedReferrals = new Set<string>()

    for (const rule of applicableRules) {
      for (const rx of rule.suggestions.prescriptions) {
        if (!addedMedications.has(rx.medication.toLowerCase())) {
          aggregatedSuggestions.prescriptions.push(rx)
          addedMedications.add(rx.medication.toLowerCase())
        }
      }
      for (const exam of rule.suggestions.exams) {
        const examKey = `${exam.examType}-${exam.description}`.toLowerCase()
        if (!addedExams.has(examKey)) {
          aggregatedSuggestions.exams.push(exam)
          addedExams.add(examKey)
        }
      }
      for (const ref of rule.suggestions.referrals) {
        if (!addedReferrals.has(ref.specialty.toLowerCase())) {
          aggregatedSuggestions.referrals.push(ref)
          addedReferrals.add(ref.specialty.toLowerCase())
        }
      }
    }

    // Sugestões da IA (Groq/Ollama): fitoterapia, homeopatia, florais, etc.
    const llm = await getLLMSuggestions({
      fullText: fullText.slice(0, 5000),
      patientAge: patientAge ?? undefined,
      patientSex: patientSex ?? undefined
    })
    for (const rx of llm.prescriptions) {
      const key = rx.medication.trim().toLowerCase()
      if (key && !addedMedications.has(key)) {
        aggregatedSuggestions.prescriptions.push(rx)
        addedMedications.add(key)
      }
    }
    for (const exam of llm.exams) {
      const examKey = `${exam.examType}-${exam.description}`.toLowerCase()
      if (!addedExams.has(examKey)) {
        aggregatedSuggestions.exams.push(exam)
        addedExams.add(examKey)
      }
    }
    for (const ref of llm.referrals) {
      if (!addedReferrals.has(ref.specialty.toLowerCase())) {
        aggregatedSuggestions.referrals.push(ref)
        addedReferrals.add(ref.specialty.toLowerCase())
      }
    }

    // Gerar warnings baseado na idade e sexo
    const warnings: string[] = []
    
    if (patientAge && patientAge < 18) {
      warnings.push('Paciente pediátrico - verifique doses ajustadas para idade')
    }
    if (patientAge && patientAge >= 65) {
      warnings.push('Paciente idoso - atenção a polifarmácia e função renal')
    }
    if (patientSex === 'F' && /gestante|grávida|amenorr/i.test(fullText)) {
      warnings.push('Gestante - verificar contraindicações de medicamentos')
    }

    // Gerar resumo
    const hasSuggestions = aggregatedSuggestions.prescriptions.length > 0 ||
      aggregatedSuggestions.exams.length > 0 ||
      aggregatedSuggestions.referrals.length > 0
    let summary = ''
    if (hasSuggestions) {
      summary = `Sugeridas ${aggregatedSuggestions.prescriptions.length} medicação(ões) (podem incluir fitoterapia, homeopatia, florais conforme o caso), ` +
                `${aggregatedSuggestions.exams.length} exame(s) e ` +
                `${aggregatedSuggestions.referrals.length} encaminhamento(s). Revise e aplique o que fizer sentido.`
      if (applicableRules.length > 0) {
        summary = `Análise identificou ${applicableRules.length} padrão(ões) clínico(s). ` + summary
      }
    } else {
      summary = 'Nenhuma sugestão específica para este caso. Continue a avaliação clínica individual.'
    }

    return NextResponse.json({
      suggestions: {
        ...aggregatedSuggestions,
        summary,
        warnings
      }
    })

  } catch (error: any) {
    logger.error('Error in AI suggestions:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar sugestões' },
      { status: 500 }
    )
  }
}
