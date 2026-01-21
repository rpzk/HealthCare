import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Buscar questões de forças
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const audience = searchParams.get('audience') || 'BOTH'

    const questions = await prisma.strengthQuestion.findMany({
      where: {
        active: true,
        OR: [
          { targetAudience: 'BOTH' },
          { targetAudience: audience as 'STAFF' | 'PATIENT' | 'BOTH' }
        ]
      },
      orderBy: [
        { strengthCode: 'asc' },
        { order: 'asc' }
      ]
    })

    const parsed = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }))

    return NextResponse.json({ questions: parsed })
  } catch (error) {
    logger.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar questões' },
      { status: 500 }
    )
  }
}

// POST - Seed questões de forças
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Questões adaptadas para contexto de saúde
    const questions = [
      // CRIATIVIDADE
      {
        strengthCode: 'CREATIVITY',
        questionText: 'Quando preciso resolver um problema de saúde ou bem-estar, eu...',
        options: [
          { value: 1, text: 'Sigo apenas o que o médico mandou' },
          { value: 2, text: 'Às vezes penso em alternativas' },
          { value: 3, text: 'Busco formas diferentes de cuidar de mim' },
          { value: 4, text: 'Frequentemente encontro soluções criativas' },
          { value: 5, text: 'Sempre invento formas novas e originais de me cuidar' }
        ],
        order: 1
      },
      // CURIOSIDADE
      {
        strengthCode: 'CURIOSITY',
        questionText: 'Quando recebo um diagnóstico ou tratamento novo, eu...',
        options: [
          { value: 1, text: 'Aceito sem questionar' },
          { value: 2, text: 'Raramente pesquiso mais' },
          { value: 3, text: 'Às vezes busco entender melhor' },
          { value: 4, text: 'Frequentemente pesquiso e pergunto' },
          { value: 5, text: 'Sempre quero saber tudo sobre o assunto' }
        ],
        order: 1
      },
      // PERSEVERANÇA
      {
        strengthCode: 'PERSEVERANCE',
        questionText: 'Quando começo um tratamento ou nova rotina de saúde, eu...',
        options: [
          { value: 1, text: 'Desisto facilmente se for difícil' },
          { value: 2, text: 'Paro depois de algumas tentativas' },
          { value: 3, text: 'Continuo por um tempo razoável' },
          { value: 4, text: 'Persisto mesmo com dificuldades' },
          { value: 5, text: 'Nunca desisto até atingir meu objetivo' }
        ],
        order: 1
      },
      // VITALIDADE
      {
        strengthCode: 'ZEST',
        questionText: 'De modo geral, como você encara seu dia a dia?',
        options: [
          { value: 1, text: 'Sem energia, apenas sobrevivendo' },
          { value: 2, text: 'Com pouca motivação' },
          { value: 3, text: 'De forma equilibrada' },
          { value: 4, text: 'Com bastante energia e disposição' },
          { value: 5, text: 'Com entusiasmo e paixão pela vida' }
        ],
        order: 1
      },
      // BONDADE
      {
        strengthCode: 'KINDNESS',
        questionText: 'Quando vejo alguém precisando de ajuda, eu...',
        options: [
          { value: 1, text: 'Raramente me envolvo' },
          { value: 2, text: 'Ajudo apenas se for fácil' },
          { value: 3, text: 'Às vezes ofereço ajuda' },
          { value: 4, text: 'Frequentemente ajudo sem esperar nada' },
          { value: 5, text: 'Sempre busco formas de ajudar os outros' }
        ],
        order: 1
      },
      // AMOR
      {
        strengthCode: 'LOVE',
        questionText: 'Em relação às pessoas importantes na minha vida, eu...',
        options: [
          { value: 1, text: 'Tenho dificuldade em me conectar' },
          { value: 2, text: 'Mantenho certa distância' },
          { value: 3, text: 'Tenho alguns relacionamentos próximos' },
          { value: 4, text: 'Cultivo relacionamentos profundos' },
          { value: 5, text: 'Tenho conexões muito fortes e significativas' }
        ],
        order: 1
      },
      // AUTOCONTROLE
      {
        strengthCode: 'SELF_REGULATION',
        questionText: 'Quando tenho vontade de fazer algo que sei que não é saudável, eu...',
        options: [
          { value: 1, text: 'Sempre cedo à vontade' },
          { value: 2, text: 'Geralmente cedo' },
          { value: 3, text: 'Às vezes consigo resistir' },
          { value: 4, text: 'Frequentemente controlo o impulso' },
          { value: 5, text: 'Tenho forte disciplina e autocontrole' }
        ],
        order: 1
      },
      // GRATIDÃO
      {
        strengthCode: 'GRATITUDE',
        questionText: 'Com que frequência você para para agradecer as coisas boas da vida?',
        options: [
          { value: 1, text: 'Nunca penso nisso' },
          { value: 2, text: 'Raramente' },
          { value: 3, text: 'Às vezes' },
          { value: 4, text: 'Frequentemente' },
          { value: 5, text: 'Diariamente e com profundidade' }
        ],
        order: 1
      },
      // ESPERANÇA
      {
        strengthCode: 'HOPE',
        questionText: 'Quando penso no futuro da minha saúde, eu...',
        options: [
          { value: 1, text: 'Tenho medo e pessimismo' },
          { value: 2, text: 'Sou um pouco negativo' },
          { value: 3, text: 'Sou neutro, não penso muito' },
          { value: 4, text: 'Tenho esperança de melhorar' },
          { value: 5, text: 'Acredito fortemente em um futuro saudável' }
        ],
        order: 1
      },
      // PERSPECTIVA
      {
        strengthCode: 'PERSPECTIVE',
        questionText: 'Quando enfrento um desafio de saúde, eu consigo...',
        options: [
          { value: 1, text: 'Focar apenas no problema imediato' },
          { value: 2, text: 'Ver pouco além do momento' },
          { value: 3, text: 'Ter alguma visão de longo prazo' },
          { value: 4, text: 'Ver o quadro maior claramente' },
          { value: 5, text: 'Ter uma perspectiva ampla e sábia da situação' }
        ],
        order: 1
      },
      // HONESTIDADE
      {
        strengthCode: 'HONESTY',
        questionText: 'Ao falar sobre minha saúde com profissionais, eu...',
        options: [
          { value: 1, text: 'Omito informações importantes' },
          { value: 2, text: 'Às vezes evito certas verdades' },
          { value: 3, text: 'Sou razoavelmente honesto' },
          { value: 4, text: 'Sou bastante transparente' },
          { value: 5, text: 'Sou completamente honesto, mesmo sobre coisas difíceis' }
        ],
        order: 1
      },
      // ESPIRITUALIDADE
      {
        strengthCode: 'SPIRITUALITY',
        questionText: 'Você sente que sua vida tem um propósito ou significado maior?',
        options: [
          { value: 1, text: 'Não penso nisso' },
          { value: 2, text: 'Raramente reflito sobre isso' },
          { value: 3, text: 'Às vezes sinto um propósito' },
          { value: 4, text: 'Frequentemente me sinto conectado a algo maior' },
          { value: 5, text: 'Tenho uma forte sensação de propósito e significado' }
        ],
        order: 1
      }
    ]

    let created = 0
    for (const q of questions) {
      const existing = await prisma.strengthQuestion.findFirst({
        where: {
          strengthCode: q.strengthCode,
          questionText: q.questionText
        }
      })

      if (!existing) {
        await prisma.strengthQuestion.create({
          data: {
            strengthCode: q.strengthCode,
            questionText: q.questionText,
            questionType: 'SCALE',
            options: JSON.stringify(q.options),
            targetAudience: 'BOTH',
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
