// Script para fazer seed dos templates de questionário
// Execute com: npx tsx scripts/seed-questionnaire-templates.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Templates integrativos
const TEMPLATES = {
  AYURVEDA_PRAKRITI: {
    name: 'Avaliação de Prakriti (Constituição Ayurveda)',
    description: 'Questionário completo para determinar a constituição ayurvédica do paciente (Vata, Pitta, Kapha)',
    patientIntro: '🌿 Este questionário ajudará a identificar sua constituição natural segundo o Ayurveda.',
    therapeuticSystem: 'AYURVEDA',
    estimatedMinutes: 20,
    themeColor: '#10B981',
    iconEmoji: '🌿',
    aiAnalysisPrompt: 'Analise as respostas e calcule os percentuais de Vata, Pitta e Kapha.',
    scoringLogic: { type: 'dosha', dimensions: ['vata', 'pitta', 'kapha'] },
    categories: [
      {
        name: 'Características Físicas',
        iconEmoji: '🧍',
        description: 'Aspectos corporais e físicos',
        questions: [
          {
            text: 'Qual é o seu tipo de corpo predominante?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Magro, ossos proeminentes, difícil ganhar peso', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Médio, proporcional, musculoso', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Grande, robusto, ganha peso facilmente', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          },
          {
            text: 'Como é sua pele naturalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Seca, fina, fria', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Macia, oleosa, quente, com tendência a vermelhidão', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Espessa, oleosa, fria, suave', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          },
          {
            text: 'Como são suas articulações?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Finas, proeminentes, estalam facilmente', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Médias, flexíveis', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Grandes, bem lubrificadas', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Digestão e Apetite',
        iconEmoji: '🍽️',
        description: 'Padrões digestivos',
        questions: [
          {
            text: 'Como é seu apetite?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular, às vezes forte, às vezes fraco', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Forte, não tolero pular refeições', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Constante mas moderado, posso pular refeições', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          },
          {
            text: 'Como é sua digestão?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular, com gases e distensão', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Rápida, com tendência a acidez', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Lenta, pesada após as refeições', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Mente e Emoções',
        iconEmoji: '🧠',
        description: 'Padrões mentais e emocionais',
        questions: [
          {
            text: 'Qual emoção você sente com mais frequência?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Ansiedade, medo, preocupação', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Irritação, raiva, frustração', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Apego, tristeza, letargia', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          },
          {
            text: 'Como você lida com estresse?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Fico ansioso, agitado, insônia', emoji: '🌬️', scoreValue: { vata: 2 } },
              { text: 'Fico irritado, agressivo', emoji: '🔥', scoreValue: { pitta: 2 } },
              { text: 'Fico quieto, como mais, durmo mais', emoji: '💧', scoreValue: { kapha: 2 } }
            ]
          }
        ]
      }
    ]
  },
  
  UNIVERSAL_INTEGRATIVE: {
    name: 'Anamnese Integrativa Universal',
    description: 'Questionário unificado que avalia Ayurveda, MTC, Homeopatia e Antroposofia em 15 perguntas',
    patientIntro: '✨ Bem-vindo à Anamnese Integrativa Universal! Este questionário especial integra sabedorias de diferentes tradições médicas em apenas 15 minutos.',
    therapeuticSystem: 'GENERAL',
    estimatedMinutes: 15,
    themeColor: '#6366F1',
    iconEmoji: '✨',
    aiAnalysisPrompt: 'Analise de forma integrada para os 4 sistemas: Ayurveda, MTC, Homeopatia e Antroposofia.',
    scoringLogic: { 
      type: 'multi_system',
      systems: {
        ayurveda: ['vata', 'pitta', 'kapha'],
        anthroposophy: ['sanguine', 'choleric', 'melancholic', 'phlegmatic'],
        tcm: ['wood', 'fire', 'earth', 'metal', 'water', 'yin', 'yang'],
        homeopathy: ['hot', 'cold', 'dry', 'wet']
      }
    },
    categories: [
      {
        name: 'Constituição Física',
        iconEmoji: '🧍',
        description: 'Sua estrutura corporal natural',
        questions: [
          {
            text: 'Qual descrição melhor representa seu corpo?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Magro, leve, ossos finos, movimentos rápidos', emoji: '🌬️', scoreValue: { vata: 2, sanguine: 1, wood: 1 } },
              { text: 'Médio, musculoso, quente, tendência a vermelhidão', emoji: '🔥', scoreValue: { pitta: 2, choleric: 1, fire: 1, hot: 2 } },
              { text: 'Robusto, pesado, pele suave, ganho de peso fácil', emoji: '💧', scoreValue: { kapha: 2, phlegmatic: 1, earth: 1, wet: 2 } },
              { text: 'Alongado, delicado, reflexivo, movimentos lentos', emoji: '🌙', scoreValue: { vata: 1, melancholic: 2, metal: 1, cold: 1 } }
            ]
          },
          {
            text: 'Como você reage ao clima frio?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Detesto, sinto muito frio, mãos e pés gelados', emoji: '❄️', scoreValue: { vata: 2, cold: 2, yin: 1 } },
              { text: 'Gosto, me refresca, sinto calor facilmente', emoji: '🔥', scoreValue: { pitta: 2, hot: 2, yang: 2 } },
              { text: 'Indiferente, me adapto bem', emoji: '☯️', scoreValue: { kapha: 1, phlegmatic: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Temperamento',
        iconEmoji: '🎭',
        description: 'Sua natureza emocional e social',
        questions: [
          {
            text: 'Em situações sociais, você tende a:',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Ser o centro das atenções, conversar com todos', emoji: '☀️', scoreValue: { sanguine: 2, fire: 1, pitta: 1, yang: 1 } },
              { text: 'Liderar, organizar, tomar iniciativa', emoji: '⚡', scoreValue: { choleric: 2, wood: 2, pitta: 1 } },
              { text: 'Observar, preferir conversas profundas com poucos', emoji: '🌙', scoreValue: { melancholic: 2, metal: 1, vata: 1, yin: 1 } },
              { text: 'Apoiar, mediar, manter a harmonia', emoji: '🌊', scoreValue: { phlegmatic: 2, water: 1, kapha: 1 } }
            ]
          },
          {
            text: 'Qual é sua maior qualidade?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Alegria, entusiasmo, otimismo', emoji: '☀️', scoreValue: { sanguine: 2, fire: 2 } },
              { text: 'Determinação, coragem, liderança', emoji: '⚡', scoreValue: { choleric: 2, wood: 2 } },
              { text: 'Profundidade, sensibilidade, perfeição', emoji: '🎨', scoreValue: { melancholic: 2, metal: 2 } },
              { text: 'Calma, paciência, estabilidade', emoji: '🌊', scoreValue: { phlegmatic: 2, water: 2, earth: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Energia e Vitalidade',
        iconEmoji: '⚡',
        description: 'Seus padrões de energia',
        questions: [
          {
            text: 'Como é seu nível de energia ao longo do dia?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Variável, altos e baixos, explosões de energia', emoji: '🎢', scoreValue: { vata: 2, sanguine: 1 } },
              { text: 'Alto e constante, muita disposição', emoji: '🔥', scoreValue: { pitta: 2, choleric: 1, yang: 2 } },
              { text: 'Moderado e estável, energia duradoura', emoji: '🌳', scoreValue: { kapha: 2, phlegmatic: 1 } },
              { text: 'Baixo, preciso me poupar, canso fácil', emoji: '🌙', scoreValue: { vata: 1, melancholic: 1, yin: 2 } }
            ]
          },
          {
            text: 'Em qual período do dia você se sente melhor?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Manhã cedo (6-10h)', emoji: '🌅', scoreValue: { vata: 1, kapha: 1 } },
              { text: 'Meio do dia (10-14h)', emoji: '☀️', scoreValue: { pitta: 2, fire: 1 } },
              { text: 'Tarde (14-18h)', emoji: '🌤️', scoreValue: { vata: 2, sanguine: 1 } },
              { text: 'Noite (18-22h)', emoji: '🌙', scoreValue: { kapha: 1, melancholic: 1 } }
            ]
          }
        ]
      }
    ]
  }
}

async function main() {
  console.log('🌱 Iniciando seed de templates de questionários...\n')
  
  let created = 0
  let skipped = 0
  
  for (const [key, template] of Object.entries(TEMPLATES)) {
    // Verificar se já existe
    const existing = await prisma.questionnaireTemplate.findFirst({
      where: { 
        name: template.name,
        isBuiltIn: true
      }
    })
    
    if (existing) {
      console.log(`⏭️  ${template.iconEmoji} ${template.name} - já existe`)
      skipped++
      continue
    }
    
    // Criar template
    await prisma.questionnaireTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        patientIntro: template.patientIntro,
        therapeuticSystem: template.therapeuticSystem as any,
        estimatedMinutes: template.estimatedMinutes,
        themeColor: template.themeColor,
        iconEmoji: template.iconEmoji,
        isBuiltIn: true,
        isPublic: true,
        aiAnalysisPrompt: template.aiAnalysisPrompt,
        scoringLogic: template.scoringLogic,
        categories: {
          create: template.categories.map((cat, catIndex) => ({
            name: cat.name,
            description: cat.description,
            iconEmoji: cat.iconEmoji,
            order: catIndex,
            questions: {
              create: cat.questions.map((q: any, qIndex) => ({
                text: q.text,
                helpText: q.helpText,
                type: q.type || 'SINGLE_CHOICE',
                isRequired: q.isRequired ?? true,
                order: qIndex,
                options: q.options ? {
                  create: q.options.map((opt: any, optIndex: number) => ({
                    text: opt.text,
                    emoji: opt.emoji,
                    order: optIndex,
                    scoreValue: opt.scoreValue
                  }))
                } : undefined
              }))
            }
          }))
        }
      }
    })
    
    console.log(`✅ ${template.iconEmoji} ${template.name} - criado!`)
    created++
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 RESULTADO: ${created} criados, ${skipped} já existiam`)
  console.log('='.repeat(50))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
