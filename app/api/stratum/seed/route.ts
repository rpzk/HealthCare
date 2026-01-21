import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST - Seed questões iniciais (apenas ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Questões baseadas na teoria de Elliott Jaques - Time Span of Discretion
    const questions = [
      // CATEGORIA: TIME_HORIZON - Horizonte Temporal
      {
        category: 'TIME_HORIZON',
        questionText: 'Quando você recebe um projeto importante no trabalho, qual é o horizonte de tempo típico que você consegue planejar com clareza?',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Consigo planejar bem o que fazer hoje e amanhã', timeSpan: 1 },
          { id: 'b', text: 'Consigo planejar as próximas semanas com clareza', timeSpan: 2 },
          { id: 'c', text: 'Consigo visualizar e planejar os próximos 3-6 meses', timeSpan: 6 },
          { id: 'd', text: 'Consigo estruturar um plano para o próximo ano', timeSpan: 12 },
          { id: 'e', text: 'Consigo pensar estrategicamente para os próximos 2-3 anos', timeSpan: 30 },
          { id: 'f', text: 'Meu planejamento naturalmente considera 5+ anos', timeSpan: 60 }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.15, stratum: 'S1' },
          'b': { timeSpanMonths: 2, score: 0.25, stratum: 'S1' },
          'c': { timeSpanMonths: 6, score: 0.45, stratum: 'S2' },
          'd': { timeSpanMonths: 12, score: 0.60, stratum: 'S2' },
          'e': { timeSpanMonths: 30, score: 0.75, stratum: 'S3' },
          'f': { timeSpanMonths: 60, score: 0.90, stratum: 'S4' }
        },
        weight: 2.0,
        order: 1
      },
      {
        category: 'TIME_HORIZON',
        questionText: 'Imagine que você foi promovido para liderar uma iniciativa de transformação. Qual abordagem você adotaria naturalmente?',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Focaria em resolver os problemas imediatos primeiro, um de cada vez' },
          { id: 'b', text: 'Criaria um plano de 90 dias com metas claras e mensuráveis' },
          { id: 'c', text: 'Desenvolveria uma estratégia anual com marcos trimestrais' },
          { id: 'd', text: 'Desenharia uma visão de 2-3 anos e estruturaria as fases' },
          { id: 'e', text: 'Pensaria no posicionamento estratégico de 5+ anos e como chegar lá' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 3, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 12, score: 0.60, stratum: 'S2' },
          'd': { timeSpanMonths: 30, score: 0.75, stratum: 'S3' },
          'e': { timeSpanMonths: 60, score: 0.90, stratum: 'S4' }
        },
        weight: 2.0,
        order: 2
      },

      // CATEGORIA: COMPLEXITY - Complexidade de Problemas
      {
        category: 'COMPLEXITY',
        questionText: 'Quando você encontra um problema no trabalho, qual é sua abordagem natural?',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Sigo procedimentos estabelecidos ou pergunto ao supervisor' },
          { id: 'b', text: 'Analiso a situação e escolho entre algumas soluções conhecidas' },
          { id: 'c', text: 'Combino diferentes abordagens de forma criativa para resolver' },
          { id: 'd', text: 'Redesenho o processo ou sistema para evitar o problema futuro' },
          { id: 'e', text: 'Questiono se o problema em si está bem definido e repenso o contexto' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 12, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 36, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 60, score: 0.95, stratum: 'S5' }
        },
        weight: 1.5,
        order: 3
      },
      {
        category: 'COMPLEXITY',
        questionText: 'Ao analisar uma situação complexa com múltiplas variáveis, você tende a:',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Focar nas variáveis mais óbvias e tomar decisões rápidas' },
          { id: 'b', text: 'Identificar 2-3 fatores principais e trabalhar com eles' },
          { id: 'c', text: 'Mapear as conexões entre diferentes fatores antes de decidir' },
          { id: 'd', text: 'Construir modelos mentais considerando interações de segunda ordem' },
          { id: 'e', text: 'Pensar em termos de sistemas e como pequenas mudanças propagam' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 36, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 72, score: 0.95, stratum: 'S5' }
        },
        weight: 1.5,
        order: 4
      },

      // CATEGORIA: ABSTRACTION - Nível de Abstração
      {
        category: 'ABSTRACTION',
        questionText: 'Quando você explica seu trabalho para outras pessoas, você naturalmente usa:',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Exemplos concretos e específicos do dia a dia' },
          { id: 'b', text: 'Comparações e analogias simples' },
          { id: 'c', text: 'Categorias e padrões que você observou' },
          { id: 'd', text: 'Princípios e frameworks conceituais' },
          { id: 'e', text: 'Teorias e modelos abstratos que conectam diferentes áreas' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 2, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 48, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 96, score: 0.95, stratum: 'S5' }
        },
        weight: 1.0,
        order: 5
      },

      // CATEGORIA: UNCERTAINTY - Tolerância à Ambiguidade
      {
        category: 'UNCERTAINTY',
        questionText: 'Quando você precisa tomar uma decisão importante sem ter todas as informações:',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Fico desconfortável e busco mais dados antes de decidir' },
          { id: 'b', text: 'Consigo decidir se tiver pelo menos as informações principais' },
          { id: 'c', text: 'Aceito a incerteza e trabalho com probabilidades e cenários' },
          { id: 'd', text: 'Uso a incerteza como oportunidade para criar opções' },
          { id: 'e', text: 'Navego naturalmente em ambiguidade e defino a própria estrutura' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 48, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 96, score: 0.95, stratum: 'S5' }
        },
        weight: 1.5,
        order: 6
      },

      // CATEGORIA: DECISION_MAKING - Tomada de Decisão
      {
        category: 'DECISION_MAKING',
        questionText: 'Qual tipo de decisão você se sente mais confortável tomando?',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Decisões operacionais do dia a dia dentro de regras claras' },
          { id: 'b', text: 'Decisões que afetam minha equipe nas próximas semanas/meses' },
          { id: 'c', text: 'Decisões que impactam múltiplas equipes ou projetos' },
          { id: 'd', text: 'Decisões estratégicas que definem direção de uma área' },
          { id: 'e', text: 'Decisões que transformam a organização ou criam novos negócios' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 48, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 96, score: 0.95, stratum: 'S5' }
        },
        weight: 1.5,
        order: 7
      },
      {
        category: 'DECISION_MAKING',
        questionText: 'Ao delegar uma tarefa complexa, você naturalmente:',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Explica exatamente o que fazer passo a passo' },
          { id: 'b', text: 'Define o objetivo e sugere um caminho, verificando progresso' },
          { id: 'c', text: 'Define o resultado esperado e deixa a pessoa escolher o método' },
          { id: 'd', text: 'Compartilha o contexto estratégico e co-cria a abordagem' },
          { id: 'e', text: 'Define a visão e empodera a criar sua própria estratégia' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 48, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 96, score: 0.95, stratum: 'S5' }
        },
        weight: 1.0,
        order: 8
      },

      // CATEGORIA: LEADERSHIP - Estilo de Liderança
      {
        category: 'LEADERSHIP',
        questionText: 'Como você prefere que seu trabalho seja avaliado?',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'Feedback diário ou semanal sobre tarefas específicas' },
          { id: 'b', text: 'Check-ins mensais sobre progresso em projetos' },
          { id: 'c', text: 'Revisões trimestrais de metas e resultados' },
          { id: 'd', text: 'Avaliações anuais focadas em impacto estratégico' },
          { id: 'e', text: 'Ciclos plurianuais baseados em transformação organizacional' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 3, score: 0.35, stratum: 'S2' },
          'c': { timeSpanMonths: 6, score: 0.50, stratum: 'S2' },
          'd': { timeSpanMonths: 12, score: 0.70, stratum: 'S3' },
          'e': { timeSpanMonths: 36, score: 0.90, stratum: 'S4' }
        },
        weight: 1.0,
        order: 9
      },
      {
        category: 'LEADERSHIP',
        questionText: 'Quando você pensa no impacto do seu trabalho, naturalmente considera:',
        questionType: 'SCENARIO',
        options: [
          { id: 'a', text: 'O resultado imediato da tarefa que estou fazendo' },
          { id: 'b', text: 'Como isso ajuda minha equipe a alcançar metas' },
          { id: 'c', text: 'Como isso se conecta com objetivos departamentais' },
          { id: 'd', text: 'O impacto na estratégia da organização' },
          { id: 'e', text: 'As implicações para o setor ou sociedade em geral' }
        ],
        stratumMapping: {
          'a': { timeSpanMonths: 1, score: 0.20, stratum: 'S1' },
          'b': { timeSpanMonths: 6, score: 0.40, stratum: 'S2' },
          'c': { timeSpanMonths: 18, score: 0.60, stratum: 'S3' },
          'd': { timeSpanMonths: 48, score: 0.80, stratum: 'S4' },
          'e': { timeSpanMonths: 120, score: 0.95, stratum: 'S5' }
        },
        weight: 1.5,
        order: 10
      }
    ]

    // Inserir questões
    let created = 0
    for (const q of questions) {
      // Verificar se já existe
      const existing = await prisma.stratumQuestion.findFirst({
        where: { questionText: q.questionText }
      })

      if (!existing) {
        await prisma.stratumQuestion.create({
          data: {
            category: q.category as 'TIME_HORIZON' | 'COMPLEXITY' | 'ABSTRACTION' | 'UNCERTAINTY' | 'DECISION_MAKING' | 'LEADERSHIP',
            questionText: q.questionText,
            questionType: q.questionType as 'SCENARIO' | 'SCALE' | 'RANKING' | 'OPEN',
            options: JSON.stringify(q.options),
            stratumMapping: JSON.stringify(q.stratumMapping),
            weight: q.weight,
            order: q.order
          }
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created} questões criadas`,
      total: questions.length
    })
  } catch (error) {
    logger.error('Erro ao criar seed:', error)
    return NextResponse.json(
      { error: 'Erro ao criar seed' },
      { status: 500 }
    )
  }
}
