import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Types for recommendations
interface Recommendation {
  id: string
  type: 'treatment' | 'development' | 'intervention' | 'resource' | 'lifestyle'
  priority: 'essential' | 'recommended' | 'optional'
  title: string
  description: string
  rationale: string
  actions: string[]
  expectedOutcome: string
  timeframe: string
  resources?: string[]
  relatedStrengths?: string[]
  relatedStratum?: string
}

interface RecommendationContext {
  userName: string
  stratum?: {
    level: string
    title: string
    characteristics: string[]
  }
  topStrengths?: {
    name: string
    virtue: string
    score: number
  }[]
  currentGoals?: {
    title: string
    status: string
    progress: number
  }[]
  engagementLevel?: string
}

// GET - Generate AI recommendations for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const type = searchParams.get('type') // treatment | development | all

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stratumAssessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1
        },
        strengthAssessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          include: {
            results: {
              include: {
                strength: true
              }
            }
          }
        },
        developmentPlans: {
          where: { status: 'ACTIVE' },
          include: {
            goals: {
              include: {
                actions: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Build context for recommendations
    const context: RecommendationContext = {
      userName: user.name || 'Usuário'
    }

    // Add stratum info
    if (user.stratumAssessments[0]) {
      const stratum = user.stratumAssessments[0]
      const stratumInfo = getStratumInfo(stratum.calculatedStratum || 'S1')
      context.stratum = {
        level: stratum.calculatedStratum || 'S1',
        title: stratumInfo.title,
        characteristics: stratumInfo.characteristics
      }
    }

    // Add top strengths
    if (user.strengthAssessments[0]?.results) {
      const results = user.strengthAssessments[0].results
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      
      context.topStrengths = results.map(r => ({
        name: r.strength.name,
        virtue: r.strength.virtue,
        score: r.score
      }))
    }

    // Add current goals
    if (user.developmentPlans[0]?.goals) {
      context.currentGoals = user.developmentPlans[0].goals.map(g => ({
        title: g.title,
        status: g.status,
        progress: g.progress
      }))
    }

    // Calculate engagement level
    if (user.developmentPlans[0]) {
      const plan = user.developmentPlans[0]
      const completedActions = plan.goals.flatMap(g => g.actions).filter(a => a.completed).length
      const totalActions = plan.goals.flatMap(g => g.actions).length
      const engagementRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0
      
      context.engagementLevel = engagementRate >= 80 ? 'Alto' : 
                                engagementRate >= 50 ? 'Médio' : 
                                engagementRate >= 20 ? 'Baixo' : 'Muito Baixo'
    }

    // Generate rule-based recommendations
    const recommendations = generateRuleBasedRecommendations(context, type || 'all')

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name
      },
      context,
      recommendations,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar recomendações' },
      { status: 500 }
    )
  }
}

// Helper function to get stratum details
function getStratumInfo(level: string): { title: string; characteristics: string[] } {
  const stratumData: Record<string, { title: string; characteristics: string[] }> = {
    S1: {
      title: 'Operacional',
      characteristics: [
        'Foco em tarefas concretas e imediatas',
        'Horizonte de tempo curto (até 3 meses)',
        'Prefere instruções claras e diretas',
        'Execução de procedimentos definidos'
      ]
    },
    S2: {
      title: 'Diagnóstico',
      characteristics: [
        'Capacidade de análise de problemas',
        'Horizonte de tempo médio (3-12 meses)',
        'Pode identificar causas e propor soluções',
        'Coordenação de pequenas equipes'
      ]
    },
    S3: {
      title: 'Tático',
      characteristics: [
        'Pensamento sistemático',
        'Horizonte de tempo de 1-2 anos',
        'Gerenciamento de projetos complexos',
        'Tradução de estratégias em planos de ação'
      ]
    },
    S4: {
      title: 'Sistêmico',
      characteristics: [
        'Visão integrada de sistemas',
        'Horizonte de tempo de 2-5 anos',
        'Liderança de unidades de negócio',
        'Integração de múltiplas funções'
      ]
    },
    S5: {
      title: 'Estratégico',
      characteristics: [
        'Pensamento estratégico abstrato',
        'Horizonte de tempo de 5-10 anos',
        'Direção de grandes organizações',
        'Criação de sistemas e culturas'
      ]
    },
    S6: {
      title: 'Transformacional',
      characteristics: [
        'Visão transformacional',
        'Horizonte de tempo de 10-20 anos',
        'Liderança de setores inteiros',
        'Mudança de paradigmas'
      ]
    },
    S7: {
      title: 'Visionário',
      characteristics: [
        'Pensamento em escala global',
        'Horizonte de tempo de 20-50 anos',
        'Impacto em múltiplos setores',
        'Criação de novos campos de conhecimento'
      ]
    },
    S8: {
      title: 'Transcendente',
      characteristics: [
        'Visão civilizacional',
        'Horizonte de tempo de 50+ anos',
        'Impacto geracional',
        'Legado histórico'
      ]
    }
  }

  return stratumData[level] || stratumData.S1
}

function generateRuleBasedRecommendations(
  context: RecommendationContext, 
  type: string
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Stratum-based recommendations
  if (context.stratum) {
    const stratumRecs = getStratumRecommendations(context.stratum.level, context.topStrengths)
    recommendations.push(...stratumRecs)
  }

  // Strength-based recommendations
  if (context.topStrengths && context.topStrengths.length > 0) {
    const strengthRecs = getStrengthRecommendations(context.topStrengths)
    recommendations.push(...strengthRecs)
  }

  // Engagement-based recommendations
  if (context.engagementLevel) {
    const engagementRecs = getEngagementRecommendations(context.engagementLevel)
    recommendations.push(...engagementRecs)
  }

  // Goal-based recommendations
  if (context.currentGoals && context.currentGoals.length > 0) {
    const goalRecs = getGoalRecommendations(context.currentGoals)
    recommendations.push(...goalRecs)
  }

  // Filter by type if specified
  if (type && type !== 'all') {
    return recommendations.filter(r => r.type === type)
  }

  return recommendations.slice(0, 8) // Limit to 8 recommendations
}

function getStratumRecommendations(
  level: string, 
  strengths?: { name: string; virtue: string; score: number }[]
): Recommendation[] {
  const recs: Recommendation[] = []
  const numLevel = parseInt(level.replace('S', ''))

  if (numLevel <= 2) {
    recs.push({
      id: `stratum-dev-${level}`,
      type: 'development',
      priority: 'recommended',
      title: 'Desenvolvimento de Pensamento Analítico',
      description: 'Fortalecer capacidades de análise e resolução de problemas complexos.',
      rationale: `No estrato ${level}, é importante desenvolver habilidades analíticas para progressão de carreira.`,
      actions: [
        'Participar de treinamentos de resolução de problemas',
        'Praticar análise de casos reais',
        'Buscar feedback estruturado sobre tomadas de decisão',
        'Estudar metodologias de análise (5 Porquês, Ishikawa)'
      ],
      expectedOutcome: 'Maior capacidade de diagnóstico e resolução autônoma de problemas',
      timeframe: '3-6 meses',
      resources: ['Cursos de pensamento crítico', 'Mentoria com líder experiente'],
      relatedStratum: level
    })
  }

  if (numLevel >= 3 && numLevel <= 4) {
    recs.push({
      id: `stratum-leadership-${level}`,
      type: 'development',
      priority: 'essential',
      title: 'Desenvolvimento de Liderança Sistêmica',
      description: 'Aprimorar habilidades de liderança e gestão de equipes.',
      rationale: `No estrato ${level}, liderança efetiva é crucial para o sucesso.`,
      actions: [
        'Liderar projetos multidisciplinares',
        'Desenvolver competências de coaching',
        'Praticar delegação efetiva',
        'Participar de programas de liderança'
      ],
      expectedOutcome: 'Liderança mais efetiva e equipes mais engajadas',
      timeframe: '6-12 meses',
      resources: ['Programa de liderança', 'Coach executivo'],
      relatedStratum: level
    })
  }

  if (numLevel >= 5) {
    recs.push({
      id: `stratum-strategic-${level}`,
      type: 'development',
      priority: 'essential',
      title: 'Pensamento Estratégico Avançado',
      description: 'Desenvolver visão de longo prazo e capacidade de transformação organizacional.',
      rationale: `No estrato ${level}, o pensamento estratégico de alto nível é essencial.`,
      actions: [
        'Participar de fóruns estratégicos',
        'Desenvolver cenários de longo prazo',
        'Mentorear líderes emergentes',
        'Estudar casos de transformação organizacional'
      ],
      expectedOutcome: 'Maior impacto estratégico e legado organizacional',
      timeframe: '12-24 meses',
      resources: ['MBA executivo', 'Board de conselheiros'],
      relatedStratum: level
    })
  }

  return recs
}

function getStrengthRecommendations(
  strengths: { name: string; virtue: string; score: number }[]
): Recommendation[] {
  const recs: Recommendation[] = []
  const topStrength = strengths[0]

  if (topStrength) {
    recs.push({
      id: `strength-leverage-${topStrength.name.toLowerCase().replace(/\s/g, '-')}`,
      type: 'development',
      priority: 'recommended',
      title: `Potencializar ${topStrength.name}`,
      description: `Usar a força ${topStrength.name} de forma mais intencional no dia a dia.`,
      rationale: `${topStrength.name} é sua força dominante (score ${topStrength.score}). Utilizá-la mais conscientemente aumentará satisfação e efetividade.`,
      actions: [
        `Identificar 3 formas de usar ${topStrength.name} esta semana`,
        'Buscar projetos que alinhem com esta força',
        'Compartilhar esta força com colegas através de mentoria',
        'Refletir semanalmente sobre momentos de uso da força'
      ],
      expectedOutcome: 'Maior engajamento e satisfação no trabalho',
      timeframe: '1-3 meses',
      relatedStrengths: [topStrength.name]
    })
  }

  // Check for wisdom strengths
  const wisdomStrengths = strengths.filter(s => s.virtue === 'Sabedoria')
  if (wisdomStrengths.length >= 2) {
    recs.push({
      id: 'strength-wisdom-cluster',
      type: 'development',
      priority: 'optional',
      title: 'Desenvolver Perfil de Conselheiro',
      description: 'Suas forças de sabedoria indicam potencial para papéis de aconselhamento.',
      rationale: 'Cluster de forças de sabedoria sugere talento natural para mentoria e consultoria.',
      actions: [
        'Oferecer-se como mentor para colegas',
        'Participar de grupos de discussão estratégica',
        'Documentar aprendizados e insights',
        'Desenvolver habilidades de facilitação'
      ],
      expectedOutcome: 'Reconhecimento como conselheiro confiável',
      timeframe: '6-12 meses',
      relatedStrengths: wisdomStrengths.map(s => s.name)
    })
  }

  // Check for humanity strengths
  const humanityStrengths = strengths.filter(s => s.virtue === 'Humanidade')
  if (humanityStrengths.length >= 2) {
    recs.push({
      id: 'strength-humanity-cluster',
      type: 'lifestyle',
      priority: 'recommended',
      title: 'Cuidado com Esgotamento Empático',
      description: 'Pessoas com forças de humanidade podem se esgotar cuidando dos outros.',
      rationale: 'Alto nível de empatia requer práticas de autocuidado para sustentabilidade.',
      actions: [
        'Estabelecer limites claros no cuidado com outros',
        'Praticar técnicas de regulação emocional',
        'Reservar tempo para atividades restauradoras',
        'Buscar supervisão ou apoio profissional se necessário'
      ],
      expectedOutcome: 'Cuidado sustentável sem esgotamento',
      timeframe: 'Contínuo',
      relatedStrengths: humanityStrengths.map(s => s.name)
    })
  }

  return recs
}

function getEngagementRecommendations(engagementLevel: string): Recommendation[] {
  const recs: Recommendation[] = []

  if (engagementLevel === 'Muito Baixo' || engagementLevel === 'Baixo') {
    recs.push({
      id: 'engagement-recovery',
      type: 'intervention',
      priority: 'essential',
      title: 'Plano de Recuperação de Engajamento',
      description: 'Identificar barreiras e reconectar com o plano de desenvolvimento.',
      rationale: 'Baixo engajamento pode indicar falta de motivação, obstáculos práticos ou desalinhamento de metas.',
      actions: [
        'Agendar conversa de realinhamento com facilitador',
        'Revisar e simplificar metas se necessário',
        'Identificar e remover barreiras práticas',
        'Celebrar pequenas conquistas para recuperar momentum'
      ],
      expectedOutcome: 'Retomada do engajamento ativo',
      timeframe: '2-4 semanas'
    })
  }

  if (engagementLevel === 'Alto') {
    recs.push({
      id: 'engagement-sustain',
      type: 'development',
      priority: 'optional',
      title: 'Manter Momentum de Alta Performance',
      description: 'Estratégias para sustentar o alto nível de engajamento.',
      rationale: 'Alto engajamento deve ser sustentado para evitar burnout e manter resultados.',
      actions: [
        'Estabelecer rituais de celebração de conquistas',
        'Balancear desafio com recuperação',
        'Compartilhar aprendizados com pares',
        'Planejar próximos desafios de crescimento'
      ],
      expectedOutcome: 'Engajamento sustentável de longo prazo',
      timeframe: 'Contínuo'
    })
  }

  return recs
}

function getGoalRecommendations(
  goals: { title: string; status: string; progress: number }[]
): Recommendation[] {
  const recs: Recommendation[] = []

  const stuckGoals = goals.filter(g => g.status === 'IN_PROGRESS' && g.progress < 30)
  if (stuckGoals.length > 0) {
    recs.push({
      id: 'goals-stuck',
      type: 'intervention',
      priority: 'recommended',
      title: 'Destravar Metas Estagnadas',
      description: `${stuckGoals.length} meta(s) precisam de atenção especial.`,
      rationale: 'Metas em progresso mas com baixo avanço podem precisar de ajustes ou suporte adicional.',
      actions: [
        'Revisar se as metas são realistas e alcançáveis',
        'Dividir metas grandes em passos menores',
        'Identificar recursos ou suporte necessários',
        'Considerar ajustar prazos se necessário'
      ],
      expectedOutcome: 'Progresso retomado nas metas',
      timeframe: '1-2 semanas'
    })
  }

  const nearCompletionGoals = goals.filter(g => g.progress >= 80 && g.progress < 100)
  if (nearCompletionGoals.length > 0) {
    recs.push({
      id: 'goals-finish',
      type: 'development',
      priority: 'recommended',
      title: 'Finalizar Metas Quase Completas',
      description: `${nearCompletionGoals.length} meta(s) estão próximas da conclusão.`,
      rationale: 'Concluir metas gera satisfação e libera energia para novos desafios.',
      actions: [
        'Focar energia nas ações finais',
        'Planejar celebração da conquista',
        'Documentar aprendizados do processo',
        'Identificar próxima meta prioritária'
      ],
      expectedOutcome: 'Conclusão das metas e senso de realização',
      timeframe: '1-2 semanas'
    })
  }

  return recs
}
