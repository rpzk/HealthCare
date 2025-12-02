import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface StrengthResult {
  code: string
  name: string
  score: number
  virtue: string
}

interface StratumResult {
  stratumLevel: string
  timeHorizonMonths: number
}

interface GeneratedGoal {
  title: string
  description: string
  category: 'HEALTH' | 'CAREER' | 'PERSONAL' | 'RELATIONSHIPS' | 'MENTAL' | 'SPIRITUAL'
  strengthCode: string
  actions: Array<{
    title: string
    description: string
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE'
  }>
}

// POST - Gera plano baseado nos assessments
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, focusArea } = body

    // Buscar último assessment de stratum
    const stratumAssessment = await prisma.stratumAssessment.findFirst({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'desc' },
    })

    // Buscar último assessment de forças
    const strengthsAssessment = await prisma.strengthAssessment.findFirst({
      where: patientId
        ? { patientId }
        : { userId: session.user.id },
      include: {
        results: {
          orderBy: { score: 'desc' },
          take: 5,
          include: {
            strength: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    if (!stratumAssessment && !strengthsAssessment) {
      return NextResponse.json(
        { error: 'Complete pelo menos uma avaliação antes de gerar o plano' },
        { status: 400 }
      )
    }

    // Montar contexto para geração
    const stratumData: StratumResult | null = stratumAssessment ? {
      stratumLevel: stratumAssessment.calculatedStratum || 'S2',
      timeHorizonMonths: stratumAssessment.timeSpanMonths || 6,
    } : null

    const topStrengths: StrengthResult[] = strengthsAssessment?.results.map(r => ({
      code: r.strength.code,
      name: r.strength.name,
      score: r.score,
      virtue: r.strength.virtue,
    })) || []

    // Gerar plano personalizado
    const plan = generatePlan(stratumData, topStrengths, focusArea)

    // Salvar plano no banco
    const savedPlan = await prisma.developmentPlan.create({
      data: {
        userId: patientId ? undefined : session.user.id,
        patientId: patientId || undefined,
        title: plan.title,
        futureVision: plan.futureVision,
        currentStratum: stratumData?.stratumLevel as 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | undefined,
        primaryStrengths: JSON.stringify(topStrengths.slice(0, 3).map(s => s.code)),
        targetDate: plan.targetDate,
        goals: {
          create: plan.goals.map((goal: GeneratedGoal) => ({
            title: goal.title,
            description: goal.description,
            category: goal.category,
            strengthCode: goal.strengthCode,
            actions: {
              create: goal.actions,
            },
          })),
        },
        milestones: {
          create: plan.milestones,
        },
      },
      include: {
        goals: {
          include: { actions: true },
        },
        milestones: true,
      },
    })

    logger.info(`Plano gerado automaticamente: ${savedPlan.id}`)

    return NextResponse.json(savedPlan, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao gerar plano:')
    return NextResponse.json(
      { error: 'Erro ao gerar plano de desenvolvimento' },
      { status: 500 }
    )
  }
}

// Função que gera o plano personalizado
function generatePlan(
  stratum: StratumResult | null, 
  strengths: StrengthResult[], 
  focusArea?: string
) {
  const timeHorizon = stratum?.timeHorizonMonths || 6
  const targetDate = new Date()
  targetDate.setMonth(targetDate.getMonth() + Math.min(timeHorizon, 12))

  // Templates de metas por força
  const strengthGoals: Record<string, GeneratedGoal> = {
    PERSEVERANCE: {
      title: 'Manter consistência nos hábitos de saúde',
      description: 'Use sua força Persistência para manter uma rotina saudável mesmo nos dias difíceis.',
      category: 'HEALTH',
      strengthCode: 'PERSEVERANCE',
      actions: [
        { title: 'Registrar atividade física diária', description: 'Pelo menos 30 min de movimento', frequency: 'DAILY' },
        { title: 'Preparar refeições saudáveis', description: 'Planejar cardápio semanal', frequency: 'WEEKLY' },
        { title: 'Avaliar progresso mensal', description: 'Revisar metas e ajustar conforme necessário', frequency: 'MONTHLY' },
      ],
    },
    CURIOSITY: {
      title: 'Explorar novas abordagens de bem-estar',
      description: 'Use sua Curiosidade para descobrir práticas de saúde que funcionam para você.',
      category: 'HEALTH',
      strengthCode: 'CURIOSITY',
      actions: [
        { title: 'Pesquisar nova prática de saúde', description: 'Ler sobre meditação, yoga, alimentação, etc.', frequency: 'WEEKLY' },
        { title: 'Experimentar receita saudável nova', description: 'Testar alimentos diferentes', frequency: 'WEEKLY' },
        { title: 'Assistir documentário sobre saúde', description: 'Expandir conhecimento', frequency: 'MONTHLY' },
      ],
    },
    GRATITUDE: {
      title: 'Cultivar gratidão para bem-estar emocional',
      description: 'Use sua força Gratidão para fortalecer sua saúde mental e emocional.',
      category: 'PERSONAL',
      strengthCode: 'GRATITUDE',
      actions: [
        { title: 'Diário de gratidão', description: 'Escrever 3 coisas pelas quais é grato', frequency: 'DAILY' },
        { title: 'Agradecer alguém pessoalmente', description: 'Expressar gratidão a uma pessoa', frequency: 'WEEKLY' },
        { title: 'Reflexão mensal de conquistas', description: 'Celebrar progressos', frequency: 'MONTHLY' },
      ],
    },
    KINDNESS: {
      title: 'Usar bondade para motivar mudanças',
      description: 'Use sua força Bondade, começando por ser gentil consigo mesmo durante a mudança de hábitos.',
      category: 'PERSONAL',
      strengthCode: 'KINDNESS',
      actions: [
        { title: 'Auto-compaixão diária', description: 'Perdoar-se por deslizes', frequency: 'DAILY' },
        { title: 'Ato de bondade para outros', description: 'Ajudar alguém na jornada de saúde', frequency: 'WEEKLY' },
        { title: 'Voluntariado em causa de saúde', description: 'Contribuir com comunidade', frequency: 'MONTHLY' },
      ],
    },
    HOPE: {
      title: 'Construir visão de futuro saudável',
      description: 'Use sua força Esperança para visualizar e trabalhar em direção a um futuro mais saudável.',
      category: 'PERSONAL',
      strengthCode: 'HOPE',
      actions: [
        { title: 'Visualização matinal', description: 'Imaginar-se saudável e ativo', frequency: 'DAILY' },
        { title: 'Definir micro-metas semanais', description: 'Passos alcançáveis', frequency: 'WEEKLY' },
        { title: 'Revisar board de visão', description: 'Atualizar objetivos de longo prazo', frequency: 'MONTHLY' },
      ],
    },
    SELF_REGULATION: {
      title: 'Fortalecer autocontrole para hábitos saudáveis',
      description: 'Use sua força Autocontrole para resistir a tentações e manter o foco na saúde.',
      category: 'HEALTH',
      strengthCode: 'SELF_REGULATION',
      actions: [
        { title: 'Planejamento de refeições', description: 'Evitar decisões impulsivas', frequency: 'DAILY' },
        { title: 'Técnica de pause', description: 'Esperar 10 min antes de ceder a desejos', frequency: 'DAILY' },
        { title: 'Reflexão sobre gatilhos', description: 'Identificar padrões de comportamento', frequency: 'WEEKLY' },
      ],
    },
    LOVE_OF_LEARNING: {
      title: 'Aprender continuamente sobre saúde',
      description: 'Use seu Amor ao Aprendizado para tornar-se especialista em sua própria saúde.',
      category: 'PERSONAL',
      strengthCode: 'LOVE_OF_LEARNING',
      actions: [
        { title: 'Leitura diária sobre saúde', description: '15 minutos de conteúdo educativo', frequency: 'DAILY' },
        { title: 'Curso ou workshop de saúde', description: 'Aprofundar conhecimento', frequency: 'MONTHLY' },
        { title: 'Compartilhar aprendizado', description: 'Ensinar algo novo a outra pessoa', frequency: 'WEEKLY' },
      ],
    },
    CREATIVITY: {
      title: 'Criar soluções únicas para sua saúde',
      description: 'Use sua Criatividade para inventar formas divertidas de cuidar da saúde.',
      category: 'HEALTH',
      strengthCode: 'CREATIVITY',
      actions: [
        { title: 'Inventar exercício ou receita', description: 'Criar algo novo e saudável', frequency: 'WEEKLY' },
        { title: 'Customizar ambiente para saúde', description: 'Reorganizar espaço para facilitar hábitos', frequency: 'MONTHLY' },
        { title: 'Gamificar rotina de saúde', description: 'Criar sistema de pontos ou recompensas', frequency: 'ONCE' },
      ],
    },
    SOCIAL_INTELLIGENCE: {
      title: 'Usar relações sociais para apoiar mudanças',
      description: 'Use sua Inteligência Social para criar rede de apoio na jornada de saúde.',
      category: 'RELATIONSHIPS',
      strengthCode: 'SOCIAL_INTELLIGENCE',
      actions: [
        { title: 'Conversar sobre saúde com parceiro', description: 'Alinhar objetivos em família', frequency: 'WEEKLY' },
        { title: 'Participar de grupo de apoio', description: 'Conectar com pessoas em jornada similar', frequency: 'WEEKLY' },
        { title: 'Ser mentor de alguém', description: 'Ajudar outro em sua jornada', frequency: 'MONTHLY' },
      ],
    },
    BRAVERY: {
      title: 'Enfrentar medos relacionados à saúde',
      description: 'Use sua Bravura para enfrentar exames, mudanças difíceis ou conversas sobre saúde.',
      category: 'HEALTH',
      strengthCode: 'BRAVERY',
      actions: [
        { title: 'Fazer exame adiado', description: 'Agendar check-up ou exame evitado', frequency: 'ONCE' },
        { title: 'Experimentar exercício desafiador', description: 'Sair da zona de conforto', frequency: 'WEEKLY' },
        { title: 'Conversa difícil sobre saúde', description: 'Falar com médico ou família', frequency: 'MONTHLY' },
      ],
    },
  }

  // Selecionar metas baseadas nas forças do usuário
  const goals: GeneratedGoal[] = []
  
  // Meta genérica de saúde (sempre inclui)
  goals.push({
    title: 'Construir rotina básica de saúde',
    description: 'Estabelecer fundamentos de alimentação, exercício e sono.',
    category: 'HEALTH',
    strengthCode: '',
    actions: [
      { title: 'Dormir 7-8 horas', description: 'Manter horário regular de sono', frequency: 'DAILY' },
      { title: 'Beber água adequadamente', description: 'Pelo menos 2L por dia', frequency: 'DAILY' },
      { title: 'Check-up médico', description: 'Realizar exames preventivos', frequency: 'ONCE' },
    ],
  })

  // Adicionar metas específicas das top 3 forças
  for (const strength of strengths.slice(0, 3)) {
    const goalTemplate = strengthGoals[strength.code]
    if (goalTemplate) {
      goals.push(goalTemplate)
    }
  }

  // Milestones baseados no horizonte temporal
  const milestones = [
    {
      title: '🌱 Primeiro passo dado',
      description: 'Completar a primeira semana com todas as ações diárias',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      celebration: 'Você começou! O primeiro passo é o mais importante.',
    },
    {
      title: '📈 Hábito em formação',
      description: 'Manter consistência por 30 dias',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      celebration: 'Um mês de progresso! Seu cérebro está criando novos caminhos.',
    },
    {
      title: '💪 Identidade em mudança',
      description: 'Completar 90 dias do plano',
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      celebration: 'Você não está apenas fazendo diferente, você está se tornando diferente!',
    },
  ]

  // Adicionar milestone de conclusão baseado no horizonte
  if (timeHorizon >= 6) {
    milestones.push({
      title: '🏆 Transformação completa',
      description: 'Completar o plano de desenvolvimento',
      targetDate,
      celebration: 'Você conseguiu! Esta versão de você é a que você sempre sonhou.',
    })
  }

  // Gerar visão de futuro
  const futureVision = generateFutureVision(stratum, strengths)

  return {
    title: `Plano de Desenvolvimento - ${focusArea || 'Saúde Integral'}`,
    futureVision,
    targetDate,
    goals,
    milestones,
  }
}

function generateFutureVision(
  stratum: StratumResult | null, 
  strengths: StrengthResult[]
): string {
  const strengthNames = strengths.slice(0, 3).map(s => s.name).join(', ')
  const timeframe = stratum?.timeHorizonMonths 
    ? `em ${stratum.timeHorizonMonths} meses` 
    : 'no próximo ano'

  return `${timeframe}, me vejo como uma pessoa mais saudável e realizada, ` +
    `usando minhas forças naturais (${strengthNames || 'em desenvolvimento'}) ` +
    `para criar uma vida com mais energia, propósito e bem-estar. ` +
    `Meus hábitos de saúde serão parte natural de quem eu sou, não apenas coisas que eu faço.`
}
