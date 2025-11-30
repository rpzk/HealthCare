import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar forças de caráter
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const strengths = await prisma.characterStrength.findMany({
      where: { active: true },
      orderBy: [
        { virtue: 'asc' },
        { order: 'asc' }
      ]
    })

    // Parse JSON fields
    const parsed = strengths.map(s => ({
      ...s,
      examples: s.examples ? JSON.parse(s.examples) : [],
      healthTips: s.healthTips ? JSON.parse(s.healthTips) : []
    }))

    // Agrupar por virtude
    const grouped = parsed.reduce((acc, strength) => {
      const virtue = strength.virtue
      if (!acc[virtue]) acc[virtue] = []
      acc[virtue].push(strength)
      return acc
    }, {} as Record<string, typeof parsed>)

    return NextResponse.json({ 
      strengths: parsed,
      grouped,
      total: strengths.length
    })
  } catch (error) {
    console.error('Erro ao buscar forças:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar forças de caráter' },
      { status: 500 }
    )
  }
}

// POST - Seed forças de caráter (apenas ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // 24 Forças de Caráter baseadas no VIA Survey
    const strengths = [
      // SABEDORIA (Wisdom)
      {
        code: 'CREATIVITY',
        name: 'Criatividade',
        virtue: 'WISDOM',
        description: 'Pensar em formas novas e produtivas de fazer as coisas',
        examples: ['Encontrar soluções originais', 'Inovar processos', 'Expressar ideias únicas'],
        healthTips: ['Use a criatividade para preparar refeições saudáveis diferentes', 'Crie rotinas de exercício variadas'],
        order: 1
      },
      {
        code: 'CURIOSITY',
        name: 'Curiosidade',
        virtue: 'WISDOM',
        description: 'Interesse em explorar e descobrir coisas novas',
        examples: ['Fazer perguntas', 'Explorar novos assuntos', 'Buscar aprendizado'],
        healthTips: ['Pesquise sobre sua condição de saúde', 'Experimente novos alimentos saudáveis'],
        order: 2
      },
      {
        code: 'JUDGMENT',
        name: 'Pensamento Crítico',
        virtue: 'WISDOM',
        description: 'Analisar as coisas por todos os ângulos antes de decidir',
        examples: ['Avaliar evidências', 'Questionar suposições', 'Considerar alternativas'],
        healthTips: ['Avalie informações de saúde criticamente', 'Questione tratamentos milagrosos'],
        order: 3
      },
      {
        code: 'LOVE_OF_LEARNING',
        name: 'Amor ao Aprendizado',
        virtue: 'WISDOM',
        description: 'Dominar novas habilidades e conhecimentos',
        examples: ['Estudar continuamente', 'Fazer cursos', 'Ler sobre diversos assuntos'],
        healthTips: ['Aprenda sobre nutrição e exercícios', 'Estude técnicas de relaxamento'],
        order: 4
      },
      {
        code: 'PERSPECTIVE',
        name: 'Perspectiva',
        virtue: 'WISDOM',
        description: 'Oferecer conselhos sábios a outros',
        examples: ['Ver o quadro maior', 'Aconselhar com sabedoria', 'Ter visão de longo prazo'],
        healthTips: ['Veja sua saúde como investimento de longo prazo', 'Considere o impacto futuro de hábitos atuais'],
        order: 5
      },
      
      // CORAGEM (Courage)
      {
        code: 'BRAVERY',
        name: 'Coragem',
        virtue: 'COURAGE',
        description: 'Não recuar diante de ameaças, desafios ou dor',
        examples: ['Enfrentar medos', 'Defender convicções', 'Agir apesar do medo'],
        healthTips: ['Enfrente o medo de mudanças', 'Tenha coragem de buscar ajuda quando precisar'],
        order: 1
      },
      {
        code: 'PERSEVERANCE',
        name: 'Perseverança',
        virtue: 'COURAGE',
        description: 'Terminar o que começa, persistir apesar de obstáculos',
        examples: ['Completar projetos', 'Não desistir', 'Trabalhar duro'],
        healthTips: ['Mantenha a dieta mesmo quando difícil', 'Continue o tratamento até o fim'],
        order: 2
      },
      {
        code: 'HONESTY',
        name: 'Honestidade',
        virtue: 'COURAGE',
        description: 'Falar a verdade e ser autêntico',
        examples: ['Ser genuíno', 'Assumir responsabilidades', 'Viver de forma autêntica'],
        healthTips: ['Seja honesto com seu médico sobre hábitos', 'Reconheça áreas que precisa melhorar'],
        order: 3
      },
      {
        code: 'ZEST',
        name: 'Vitalidade',
        virtue: 'COURAGE',
        description: 'Abordar a vida com entusiasmo e energia',
        examples: ['Viver com paixão', 'Ser energético', 'Aproveitar cada dia'],
        healthTips: ['Cultive atividades que te energizam', 'Durma bem para manter a vitalidade'],
        order: 4
      },
      
      // HUMANIDADE (Humanity)
      {
        code: 'LOVE',
        name: 'Amor',
        virtue: 'HUMANITY',
        description: 'Valorizar relacionamentos próximos com outros',
        examples: ['Cuidar de pessoas', 'Demonstrar afeto', 'Criar conexões profundas'],
        healthTips: ['Relacionamentos saudáveis melhoram a saúde', 'Cultive conexões que te apoiam'],
        order: 1
      },
      {
        code: 'KINDNESS',
        name: 'Bondade',
        virtue: 'HUMANITY',
        description: 'Fazer favores e boas ações para outros',
        examples: ['Ajudar desconhecidos', 'Ser generoso', 'Praticar gentileza'],
        healthTips: ['Ajudar outros melhora seu bem-estar', 'Voluntariado reduz estresse'],
        order: 2
      },
      {
        code: 'SOCIAL_INTELLIGENCE',
        name: 'Inteligência Social',
        virtue: 'HUMANITY',
        description: 'Estar consciente das motivações e sentimentos dos outros',
        examples: ['Ler ambientes sociais', 'Saber o que dizer', 'Entender emoções alheias'],
        healthTips: ['Use para construir rede de apoio', 'Comunique-se melhor com profissionais de saúde'],
        order: 3
      },
      
      // JUSTIÇA (Justice)
      {
        code: 'TEAMWORK',
        name: 'Trabalho em Equipe',
        virtue: 'JUSTICE',
        description: 'Trabalhar bem como membro de um grupo',
        examples: ['Colaborar', 'Fazer sua parte', 'Ser leal ao grupo'],
        healthTips: ['Junte-se a grupos de apoio', 'Exercite-se com amigos'],
        order: 1
      },
      {
        code: 'FAIRNESS',
        name: 'Equidade',
        virtue: 'JUSTICE',
        description: 'Tratar todas as pessoas igualmente de acordo com justiça',
        examples: ['Ser imparcial', 'Dar oportunidades iguais', 'Não discriminar'],
        healthTips: ['Advogue por acesso igual à saúde', 'Trate a si mesmo com justiça'],
        order: 2
      },
      {
        code: 'LEADERSHIP',
        name: 'Liderança',
        virtue: 'JUSTICE',
        description: 'Organizar atividades de grupo e garantir que aconteçam',
        examples: ['Inspirar outros', 'Organizar eventos', 'Guiar equipes'],
        healthTips: ['Lidere pelo exemplo em hábitos saudáveis', 'Influencie sua família positivamente'],
        order: 3
      },
      
      // TEMPERANÇA (Temperance)
      {
        code: 'FORGIVENESS',
        name: 'Perdão',
        virtue: 'TEMPERANCE',
        description: 'Perdoar aqueles que erraram',
        examples: ['Dar segundas chances', 'Não guardar rancor', 'Deixar ir mágoas'],
        healthTips: ['Perdão reduz pressão arterial', 'Soltar ressentimentos melhora saúde mental'],
        order: 1
      },
      {
        code: 'HUMILITY',
        name: 'Humildade',
        virtue: 'TEMPERANCE',
        description: 'Não se considerar mais especial que outros',
        examples: ['Reconhecer limitações', 'Aceitar feedback', 'Não buscar holofotes'],
        healthTips: ['Aceite ajuda quando precisar', 'Reconheça que não sabe tudo sobre sua saúde'],
        order: 2
      },
      {
        code: 'PRUDENCE',
        name: 'Prudência',
        virtue: 'TEMPERANCE',
        description: 'Ser cuidadoso nas escolhas, não assumir riscos desnecessários',
        examples: ['Planejar com cuidado', 'Pensar antes de agir', 'Evitar arrependimentos'],
        healthTips: ['Faça check-ups preventivos', 'Evite comportamentos de risco'],
        order: 3
      },
      {
        code: 'SELF_REGULATION',
        name: 'Autocontrole',
        virtue: 'TEMPERANCE',
        description: 'Regular o que sente e faz, ser disciplinado',
        examples: ['Controlar impulsos', 'Manter dieta', 'Gerenciar emoções'],
        healthTips: ['Essencial para mudança de hábitos', 'Base para alimentação saudável'],
        order: 4
      },
      
      // TRANSCENDÊNCIA (Transcendence)
      {
        code: 'APPRECIATION_OF_BEAUTY',
        name: 'Apreciação da Beleza',
        virtue: 'TRANSCENDENCE',
        description: 'Notar e apreciar beleza, excelência em todos os domínios',
        examples: ['Admirar natureza', 'Apreciar arte', 'Reconhecer excelência'],
        healthTips: ['Passe tempo na natureza', 'Arte e música reduzem estresse'],
        order: 1
      },
      {
        code: 'GRATITUDE',
        name: 'Gratidão',
        virtue: 'TRANSCENDENCE',
        description: 'Estar consciente e grato pelas coisas boas',
        examples: ['Agradecer regularmente', 'Reconhecer bênçãos', 'Expressar apreço'],
        healthTips: ['Diário de gratidão melhora sono', 'Gratidão fortalece sistema imune'],
        order: 2
      },
      {
        code: 'HOPE',
        name: 'Esperança',
        virtue: 'TRANSCENDENCE',
        description: 'Esperar o melhor e trabalhar para alcançá-lo',
        examples: ['Ser otimista', 'Visualizar futuro positivo', 'Acreditar no melhor'],
        healthTips: ['Otimismo melhora recuperação', 'Esperança motiva tratamento'],
        order: 3
      },
      {
        code: 'HUMOR',
        name: 'Humor',
        virtue: 'TRANSCENDENCE',
        description: 'Gostar de rir e fazer outros rirem',
        examples: ['Ver lado leve', 'Fazer piadas', 'Trazer alegria'],
        healthTips: ['Rir libera endorfinas', 'Humor reduz dor e estresse'],
        order: 4
      },
      {
        code: 'SPIRITUALITY',
        name: 'Espiritualidade',
        virtue: 'TRANSCENDENCE',
        description: 'Ter crenças coerentes sobre propósito e significado',
        examples: ['Buscar propósito', 'Praticar fé', 'Conectar-se com algo maior'],
        healthTips: ['Práticas espirituais reduzem ansiedade', 'Propósito aumenta longevidade'],
        order: 5
      }
    ]

    let created = 0
    for (const s of strengths) {
      const existing = await prisma.characterStrength.findUnique({
        where: { code: s.code }
      })

      if (!existing) {
        await prisma.characterStrength.create({
          data: {
            code: s.code,
            name: s.name,
            virtue: s.virtue as 'WISDOM' | 'COURAGE' | 'HUMANITY' | 'JUSTICE' | 'TEMPERANCE' | 'TRANSCENDENCE',
            description: s.description,
            examples: JSON.stringify(s.examples),
            healthTips: JSON.stringify(s.healthTips),
            order: s.order
          }
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created} forças de caráter criadas`,
      total: strengths.length
    })
  } catch (error) {
    console.error('Erro ao criar seed:', error)
    return NextResponse.json(
      { error: 'Erro ao criar seed' },
      { status: 500 }
    )
  }
}
