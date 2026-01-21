import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// Templates pré-definidos para medicina integrativa
const BUILTIN_TEMPLATES: Record<string, any> = {
  AYURVEDA_PRAKRITI: {
    name: 'Avaliação de Prakriti (Constituição Ayurveda)',
    description: 'Questionário completo para determinar a constituição ayurvédica do paciente (Vata, Pitta, Kapha)',
    patientIntro: '🌿 Este questionário ajudará a identificar sua constituição natural segundo o Ayurveda - a medicina tradicional indiana com mais de 5.000 anos. Responda pensando em como você é na MAIOR PARTE do tempo, não em momentos específicos.',
    therapeuticSystem: 'AYURVEDA',
    estimatedMinutes: 20,
    themeColor: '#10B981',
    iconEmoji: '🌿',
    aiAnalysisPrompt: 'Analise as respostas e calcule os percentuais de Vata, Pitta e Kapha. Identifique o dosha predominante (Prakriti) e possíveis desequilíbrios (Vikriti). Sugira orientações gerais de estilo de vida.',
    scoringLogic: {
      type: 'dosha',
      dimensions: ['vata', 'pitta', 'kapha']
    },
    categories: [
      {
        name: 'Características Físicas',
        iconEmoji: '🏃',
        description: 'Como é seu corpo naturalmente',
        questions: [
          {
            text: 'Qual é sua estrutura corporal natural?',
            helpText: 'Pense em como seu corpo sempre foi, mesmo em diferentes fases da vida',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Magro, ossos finos, difícil ganhar peso', emoji: '🦴', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Médio, proporcional, atlético', emoji: '💪', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Largo, robusto, tendência a ganhar peso', emoji: '🐻', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como é sua pele?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Seca, áspera, fina, fria', emoji: '🏜️', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Quente, oleosa, tendência a vermelhidão/acne', emoji: '🔥', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Oleosa, grossa, macia, fria, pálida', emoji: '💧', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como é seu cabelo?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Seco, crespo, quebradiço, fino', emoji: '🌾', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Fino, oleoso, tendência a calvície/grisalho precoce', emoji: '🦁', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Grosso, oleoso, ondulado, abundante', emoji: '🌊', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como são seus olhos?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Pequenos, secos, inquietos', emoji: '👀', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Penetrantes, sensíveis à luz, avermelhados', emoji: '🔴', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Grandes, úmidos, calmos, cílios longos', emoji: '🌸', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Digestão e Apetite',
        iconEmoji: '🍽️',
        description: 'Seus padrões alimentares e digestivos',
        questions: [
          {
            text: 'Como é seu apetite normalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular - às vezes muito, às vezes pouco', emoji: '📈📉', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Forte e regular - fico irritado se não comer', emoji: '🔥', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Estável e moderado - posso pular refeições', emoji: '⚖️', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como é sua digestão?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular - gases, prisão de ventre, inchaço', emoji: '💨', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Rápida - azia, refluxo, fezes soltas', emoji: '🌋', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Lenta - pesada, letárgica após comer', emoji: '🐢', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Que tipo de clima você prefere?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Quente e úmido - detesto frio e vento', emoji: '☀️', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Frio - não suporto calor intenso', emoji: '❄️', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Seco e quente - umidade me incomoda', emoji: '🏜️', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Sono e Energia',
        iconEmoji: '😴',
        description: 'Seus padrões de descanso e vitalidade',
        questions: [
          {
            text: 'Como é seu sono normalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Leve, interrompido, dificuldade para dormir', emoji: '🌙', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Moderado, acordando com calor ou sede', emoji: '🔥', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Pesado e longo, difícil acordar', emoji: '🐻‍❄️', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como é seu nível de energia durante o dia?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Altos e baixos, energia em picos', emoji: '📈', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Alta e focada, muita intensidade', emoji: '⚡', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Constante mas lenta, resistência', emoji: '🔋', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Mente e Emoções',
        iconEmoji: '🧠',
        description: 'Seus padrões mentais e emocionais',
        questions: [
          {
            text: 'Como você aprende melhor?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Rápido mas esquece fácil, mente criativa', emoji: '💡', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Focado e analítico, boa memória', emoji: '🎯', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Lento para aprender, mas nunca esquece', emoji: '🐘', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como você reage ao estresse?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Ansiedade, preocupação, medo', emoji: '😰', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Irritação, raiva, impaciência', emoji: '😤', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Retraimento, tristeza, apatia', emoji: '😢', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como você toma decisões?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Indeciso, mudo de ideia frequentemente', emoji: '🔄', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Rápido e decisivo, confiante', emoji: '✅', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Lento, preciso pensar bem', emoji: '🤔', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como é seu jeito de falar?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Rápido, muito, pulando de assunto', emoji: '💬', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Claro, preciso, às vezes cortante', emoji: '🎯', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Devagar, pausado, melodioso', emoji: '🎵', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Hábitos e Preferências',
        iconEmoji: '🎭',
        description: 'Seus hábitos diários e preferências',
        questions: [
          {
            text: 'Como você gasta dinheiro?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Impulsivamente, em coisas variadas', emoji: '💸', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Planejado, em coisas de qualidade/luxo', emoji: '💎', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Guardando, economizando bem', emoji: '🏦', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Como são suas amizades?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Muitos conhecidos, amizades variáveis', emoji: '👥', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Seletivo, amigos com propósito', emoji: '🤝', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Poucos mas leais e duradouros', emoji: '💝', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          },
          {
            text: 'Qual seu estilo de exercício preferido?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Leve - yoga, caminhada, dança', emoji: '🧘', scoreValue: { vata: 2, pitta: 0, kapha: 0 } },
              { text: 'Competitivo - esportes, corrida, natação', emoji: '🏆', scoreValue: { vata: 0, pitta: 2, kapha: 0 } },
              { text: 'Intenso - musculação, artes marciais', emoji: '🏋️', scoreValue: { vata: 0, pitta: 0, kapha: 2 } }
            ]
          }
        ]
      }
    ]
  },

  HOMEOPATHY_CONSTITUTIONAL: {
    name: 'Anamnese Homeopática Constitucional',
    description: 'Questionário detalhado para identificar padrões constitucionais e modalidades homeopáticas',
    patientIntro: '🌸 A homeopatia considera você como um ser único. Este questionário explora suas características individuais - físicas, emocionais e mentais - para ajudar a encontrar o melhor tratamento para você.',
    therapeuticSystem: 'HOMEOPATHY',
    estimatedMinutes: 30,
    themeColor: '#8B5CF6',
    iconEmoji: '🌸',
    aiAnalysisPrompt: 'Analise as respostas homeopáticas e identifique: 1) Constituição principal 2) Modalidades (fatores que melhoram/pioram) 3) Sintomas peculiares 4) Possíveis medicamentos constitucionais a considerar.',
    scoringLogic: {
      type: 'homeopathy',
      dimensions: ['hot', 'cold', 'dry', 'wet']
    },
    categories: [
      {
        name: 'Modalidades Térmicas',
        iconEmoji: '🌡️',
        description: 'Como temperatura e clima afetam você',
        questions: [
          {
            text: 'Você é uma pessoa mais calorenta ou friorenta?',
            type: 'SCALE',
            scaleMin: 1,
            scaleMax: 10,
            scaleMinLabel: 'Muito friorento',
            scaleMaxLabel: 'Muito calorento'
          },
          {
            text: 'Seus sintomas pioram com:',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Frio', emoji: '❄️' },
              { text: 'Calor', emoji: '🔥' },
              { text: 'Mudança de tempo', emoji: '🌦️' },
              { text: 'Tempo úmido', emoji: '💧' },
              { text: 'Vento', emoji: '💨' },
              { text: 'Tempestade', emoji: '⛈️' }
            ]
          },
          {
            text: 'Seus sintomas melhoram com:',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Calor local (compressas)', emoji: '🔥' },
              { text: 'Frio local (gelo)', emoji: '🧊' },
              { text: 'Ar fresco', emoji: '🌬️' },
              { text: 'Banho quente', emoji: '🛁' },
              { text: 'Banho frio', emoji: '🚿' }
            ]
          }
        ]
      },
      {
        name: 'Modalidades de Movimento',
        iconEmoji: '🚶',
        description: 'Como movimento e repouso afetam seus sintomas',
        questions: [
          {
            text: 'Seus sintomas melhoram com movimento?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Sim, movimento melhora', emoji: '🏃' },
              { text: 'Não, repouso melhora', emoji: '🛋️' },
              { text: 'Depende do sintoma', emoji: '🤷' }
            ]
          },
          {
            text: 'Qual a posição mais confortável para você?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Deitado de costas', emoji: '⬆️' },
              { text: 'Deitado de lado direito', emoji: '➡️' },
              { text: 'Deitado de lado esquerdo', emoji: '⬅️' },
              { text: 'Deitado de bruços', emoji: '⬇️' },
              { text: 'Sentado', emoji: '🪑' },
              { text: 'Curvado para frente', emoji: '🧎' }
            ]
          }
        ]
      },
      {
        name: 'Horários',
        iconEmoji: '🕐',
        description: 'Horários de agravação',
        questions: [
          {
            text: 'Em que período do dia você se sente pior?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Manhã (6h-12h)', emoji: '🌅' },
              { text: 'Tarde (12h-18h)', emoji: '☀️' },
              { text: 'Noite (18h-22h)', emoji: '🌆' },
              { text: 'Madrugada (22h-6h)', emoji: '🌙' },
              { text: 'Nenhum horário específico', emoji: '⏰' }
            ]
          },
          {
            text: 'Há algum horário específico em que sintomas aparecem ou pioram?',
            type: 'TEXT',
            helpText: 'Exemplo: "Sempre acordo às 3h da manhã com ansiedade"'
          }
        ]
      },
      {
        name: 'Desejos e Aversões Alimentares',
        iconEmoji: '🍕',
        description: 'O que você deseja e o que evita',
        questions: [
          {
            text: 'Quais alimentos você mais deseja?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Doces', emoji: '🍫' },
              { text: 'Salgados', emoji: '🥨' },
              { text: 'Azedos/ácidos', emoji: '🍋' },
              { text: 'Gordurosos', emoji: '🧈' },
              { text: 'Picantes', emoji: '🌶️' },
              { text: 'Gelados', emoji: '🍦' },
              { text: 'Quentes', emoji: '🍵' },
              { text: 'Ovos', emoji: '🥚' },
              { text: 'Leite', emoji: '🥛' },
              { text: 'Carne', emoji: '🥩' }
            ]
          },
          {
            text: 'Quais alimentos você tem aversão?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Gordura', emoji: '🧈' },
              { text: 'Leite', emoji: '🥛' },
              { text: 'Carne', emoji: '🥩' },
              { text: 'Peixe', emoji: '🐟' },
              { text: 'Ovos', emoji: '🥚' },
              { text: 'Café', emoji: '☕' },
              { text: 'Frutas', emoji: '🍎' },
              { text: 'Doces', emoji: '🍬' }
            ]
          },
          {
            text: 'Você tem sede?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Muita sede, bebo muito', emoji: '🚰' },
              { text: 'Pouca sede, tenho que me forçar', emoji: '💧' },
              { text: 'Normal', emoji: '🥤' }
            ]
          }
        ]
      },
      {
        name: 'Padrões Emocionais',
        iconEmoji: '❤️',
        description: 'Suas características emocionais',
        questions: [
          {
            text: 'Quais emoções você experimenta com mais frequência?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Ansiedade', emoji: '😰' },
              { text: 'Medo', emoji: '😨' },
              { text: 'Tristeza', emoji: '😢' },
              { text: 'Raiva', emoji: '😤' },
              { text: 'Irritabilidade', emoji: '😠' },
              { text: 'Ciúmes', emoji: '💚' },
              { text: 'Ressentimento', emoji: '😒' },
              { text: 'Culpa', emoji: '😔' }
            ]
          },
          {
            text: 'Quais são seus principais medos?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Morte', emoji: '💀' },
              { text: 'Doença', emoji: '🏥' },
              { text: 'Solidão', emoji: '🧍' },
              { text: 'Escuro', emoji: '🌑' },
              { text: 'Altura', emoji: '🏔️' },
              { text: 'Multidões', emoji: '👥' },
              { text: 'Animais', emoji: '🐍' },
              { text: 'Pobreza', emoji: '💰' },
              { text: 'Futuro', emoji: '🔮' }
            ]
          },
          {
            text: 'O que te consola quando está mal?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Ficar sozinho', emoji: '🧘' },
              { text: 'Companhia de alguém', emoji: '🤗' },
              { text: 'Conversar', emoji: '💬' },
              { text: 'Chorar', emoji: '😭' },
              { text: 'Ficar ocupado', emoji: '📋' },
              { text: 'Natureza', emoji: '🌳' },
              { text: 'Música', emoji: '🎵' }
            ]
          }
        ]
      },
      {
        name: 'Sonhos',
        iconEmoji: '💭',
        description: 'Padrões de sonhos recorrentes',
        questions: [
          {
            text: 'Quais tipos de sonhos você tem frequentemente?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Voar', emoji: '🕊️' },
              { text: 'Cair', emoji: '⬇️' },
              { text: 'Ser perseguido', emoji: '🏃' },
              { text: 'Morte', emoji: '💀' },
              { text: 'Água', emoji: '🌊' },
              { text: 'Animais', emoji: '🐾' },
              { text: 'Pessoas que morreram', emoji: '👻' },
              { text: 'Trabalho/escola', emoji: '🏫' },
              { text: 'Sexuais', emoji: '❤️‍🔥' }
            ]
          },
          {
            text: 'Descreva um sonho recorrente ou marcante:',
            type: 'TEXT',
            isRequired: false
          }
        ]
      }
    ]
  },

  TCM_DIAGNOSIS: {
    name: 'Avaliação Energética MTC',
    description: 'Questionário baseado nos padrões diagnósticos da Medicina Tradicional Chinesa',
    patientIntro: '☯️ A Medicina Tradicional Chinesa vê a saúde como equilíbrio de energia (Qi). Este questionário ajuda a identificar padrões de desequilíbrio nos seus meridianos e órgãos segundo a visão oriental.',
    therapeuticSystem: 'TCM',
    estimatedMinutes: 25,
    themeColor: '#EF4444',
    iconEmoji: '☯️',
    aiAnalysisPrompt: 'Analise segundo os 8 princípios da MTC (Yin/Yang, Interior/Exterior, Frio/Calor, Deficiência/Excesso). Identifique padrões de desequilíbrio de Zang-Fu e sugestões de pontos de acupuntura.',
    scoringLogic: {
      type: 'tcm',
      dimensions: ['wood', 'fire', 'earth', 'metal', 'water', 'yin', 'yang']
    },
    categories: [
      {
        name: 'Yin e Yang',
        iconEmoji: '☯️',
        description: 'Equilíbrio entre as forças complementares',
        questions: [
          {
            text: 'Você tende a sentir mais frio ou calor?',
            type: 'SCALE',
            scaleMin: 1,
            scaleMax: 10,
            scaleMinLabel: 'Sempre com frio',
            scaleMaxLabel: 'Sempre com calor'
          },
          {
            text: 'Seu corpo tende a ser mais seco ou úmido (suor)?',
            type: 'SCALE',
            scaleMin: 1,
            scaleMax: 10,
            scaleMinLabel: 'Muito seco',
            scaleMaxLabel: 'Muito úmido/suado'
          },
          {
            text: 'Sua personalidade é mais introvertida ou extrovertida?',
            type: 'SCALE',
            scaleMin: 1,
            scaleMax: 10,
            scaleMinLabel: 'Muito introvertido',
            scaleMaxLabel: 'Muito extrovertido'
          }
        ]
      },
      {
        name: 'Cinco Elementos - Emoções',
        iconEmoji: '🎭',
        description: 'Padrões emocionais segundo os 5 elementos',
        questions: [
          {
            text: 'Qual emoção você sente com mais frequência?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Raiva/Frustração (Madeira/Fígado)', emoji: '🌳', scoreValue: { wood: 2 } },
              { text: 'Alegria excessiva/Ansiedade (Fogo/Coração)', emoji: '🔥', scoreValue: { fire: 2 } },
              { text: 'Preocupação/Pensamento obsessivo (Terra/Baço)', emoji: '🌍', scoreValue: { earth: 2 } },
              { text: 'Tristeza/Melancolia (Metal/Pulmão)', emoji: '⚪', scoreValue: { metal: 2 } },
              { text: 'Medo/Insegurança (Água/Rim)', emoji: '💧', scoreValue: { water: 2 } }
            ]
          },
          {
            text: 'Qual estação do ano você menos gosta?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Primavera (ventoso)', emoji: '🌸', scoreValue: { wood: 2 } },
              { text: 'Verão (muito quente)', emoji: '☀️', scoreValue: { fire: 2 } },
              { text: 'Final do verão (úmido)', emoji: '🌧️', scoreValue: { earth: 2 } },
              { text: 'Outono (seco)', emoji: '🍂', scoreValue: { metal: 2 } },
              { text: 'Inverno (frio)', emoji: '❄️', scoreValue: { water: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Padrões de Órgãos (Zang-Fu)',
        iconEmoji: '🫀',
        description: 'Sintomas relacionados aos órgãos segundo a MTC',
        questions: [
          {
            text: 'Você tem algum destes sintomas relacionados ao FÍGADO/VESÍCULA?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Elemento Madeira',
            options: [
              { text: 'Dores de cabeça laterais', emoji: '🤕' },
              { text: 'Tensão nos ombros/pescoço', emoji: '😫' },
              { text: 'Irritabilidade', emoji: '😤' },
              { text: 'Problemas de visão', emoji: '👁️' },
              { text: 'Unhas fracas/quebradiças', emoji: '💅' },
              { text: 'Cãibras musculares', emoji: '🦵' },
              { text: 'TPM intensa', emoji: '🩸' },
              { text: 'Nenhum', emoji: '✅' }
            ]
          },
          {
            text: 'Você tem algum destes sintomas relacionados ao CORAÇÃO/INTESTINO DELGADO?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Elemento Fogo',
            options: [
              { text: 'Palpitações', emoji: '💓' },
              { text: 'Insônia', emoji: '😵' },
              { text: 'Sonhos excessivos', emoji: '💭' },
              { text: 'Ansiedade', emoji: '😰' },
              { text: 'Fala excessiva ou confusa', emoji: '🗣️' },
              { text: 'Língua com feridas', emoji: '👅' },
              { text: 'Transpiração noturna', emoji: '💦' },
              { text: 'Nenhum', emoji: '✅' }
            ]
          },
          {
            text: 'Você tem algum destes sintomas relacionados ao BAÇO/ESTÔMAGO?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Elemento Terra',
            options: [
              { text: 'Digestão lenta', emoji: '🐢' },
              { text: 'Inchaço após comer', emoji: '🎈' },
              { text: 'Fadiga', emoji: '😴' },
              { text: 'Preocupação excessiva', emoji: '🤔' },
              { text: 'Retenção de líquidos', emoji: '💧' },
              { text: 'Músculos fracos', emoji: '💪' },
              { text: 'Pouco apetite', emoji: '🍽️' },
              { text: 'Nenhum', emoji: '✅' }
            ]
          },
          {
            text: 'Você tem algum destes sintomas relacionados ao PULMÃO/INTESTINO GROSSO?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Elemento Metal',
            options: [
              { text: 'Problemas respiratórios', emoji: '🫁' },
              { text: 'Pele seca', emoji: '🏜️' },
              { text: 'Constipação', emoji: '🚽' },
              { text: 'Tristeza frequente', emoji: '😢' },
              { text: 'Gripes frequentes', emoji: '🤧' },
              { text: 'Voz fraca', emoji: '🔇' },
              { text: 'Nenhum', emoji: '✅' }
            ]
          },
          {
            text: 'Você tem algum destes sintomas relacionados aos RINS/BEXIGA?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Elemento Água',
            options: [
              { text: 'Dor lombar', emoji: '🔙' },
              { text: 'Joelhos fracos/doloridos', emoji: '🦵' },
              { text: 'Urinar frequente à noite', emoji: '🌙' },
              { text: 'Medo ou insegurança', emoji: '😨' },
              { text: 'Cabelos/dentes fracos', emoji: '🦷' },
              { text: 'Zumbido no ouvido', emoji: '👂' },
              { text: 'Falta de vontade/motivação', emoji: '😶' },
              { text: 'Nenhum', emoji: '✅' }
            ]
          }
        ]
      },
      {
        name: 'Língua e Pulso',
        iconEmoji: '👅',
        description: 'Auto-observação (o profissional confirmará)',
        questions: [
          {
            text: 'Como você descreveria sua língua?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Olhe no espelho com boa luz',
            options: [
              { text: 'Pálida', emoji: '⬜' },
              { text: 'Vermelha', emoji: '🟥' },
              { text: 'Roxa/azulada', emoji: '🟪' },
              { text: 'Com saburra branca grossa', emoji: '⬜' },
              { text: 'Com saburra amarela', emoji: '🟨' },
              { text: 'Sem saburra (lisa)', emoji: '👅' },
              { text: 'Com marcas de dentes nas bordas', emoji: '🦷' },
              { text: 'Com rachaduras', emoji: '💔' }
            ]
          },
          {
            text: 'Como você descreveria sua circulação?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { text: 'Mãos e pés frios', emoji: '🥶' },
              { text: 'Mãos e pés quentes', emoji: '🔥' },
              { text: 'Varizes', emoji: '🩸' },
              { text: 'Manchas roxas fáceis', emoji: '🟣' },
              { text: 'Dormência nas extremidades', emoji: '💤' },
              { text: 'Circulação normal', emoji: '✅' }
            ]
          }
        ]
      }
    ]
  },

  ANTHROPOSOPHY_TEMPERAMENT: {
    name: 'Avaliação de Temperamento (Antroposofia)',
    description: 'Questionário para identificar os 4 temperamentos segundo a medicina antroposófica',
    patientIntro: '🌟 A Medicina Antroposófica trabalha com os quatro temperamentos - Sanguíneo, Colérico, Melancólico e Fleumático. Este questionário ajuda a identificar seu temperamento predominante para personalizar seu tratamento.',
    therapeuticSystem: 'ANTHROPOSOPHY',
    estimatedMinutes: 15,
    themeColor: '#F59E0B',
    iconEmoji: '🌟',
    aiAnalysisPrompt: 'Analise as respostas e calcule percentuais dos 4 temperamentos (Sanguíneo, Colérico, Melancólico, Fleumático). Identifique o temperamento predominante e secundário, e sugira orientações terapêuticas.',
    scoringLogic: {
      type: 'temperament',
      dimensions: ['sanguine', 'choleric', 'melancholic', 'phlegmatic']
    },
    categories: [
      {
        name: 'Aspectos Físicos',
        iconEmoji: '🧍',
        description: 'Características corporais',
        questions: [
          {
            text: 'Qual descrição física mais combina com você?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Leve, ágil, gestos rápidos, olhar brilhante', emoji: '🦋', scoreValue: { sanguine: 2 } },
              { text: 'Compacto, forte, movimentos decididos', emoji: '🦁', scoreValue: { choleric: 2 } },
              { text: 'Magro, alongado, cabeça inclinada, pensativo', emoji: '🌙', scoreValue: { melancholic: 2 } },
              { text: 'Arredondado, calmo, movimentos lentos', emoji: '🐻', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'Como é seu andar?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Leve, saltitante, mudando de direção', emoji: '🎈', scoreValue: { sanguine: 2 } },
              { text: 'Firme, decidido, pisando forte', emoji: '🥾', scoreValue: { choleric: 2 } },
              { text: 'Arrastado, olhando para baixo', emoji: '🚶', scoreValue: { melancholic: 2 } },
              { text: 'Lento, balançando, tranquilo', emoji: '🐢', scoreValue: { phlegmatic: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Aspectos Emocionais',
        iconEmoji: '❤️',
        description: 'Padrões emocionais',
        questions: [
          {
            text: 'Como você lida com emoções?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Mudo rápido de emoção, não guardo ressentimento', emoji: '🌈', scoreValue: { sanguine: 2 } },
              { text: 'Emoções intensas, explosivas, mas passam', emoji: '🌋', scoreValue: { choleric: 2 } },
              { text: 'Emoções profundas e duradouras', emoji: '🌊', scoreValue: { melancholic: 2 } },
              { text: 'Emoções estáveis, dificilmente me altero', emoji: '⛰️', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'Em grupo, você geralmente:',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'É o animador, conversa com todos', emoji: '🎉', scoreValue: { sanguine: 2 } },
              { text: 'Lidera, organiza, toma iniciativa', emoji: '👑', scoreValue: { choleric: 2 } },
              { text: 'Fica mais quieto, observando', emoji: '🔭', scoreValue: { melancholic: 2 } },
              { text: 'Fica tranquilo, só fala se perguntado', emoji: '🧘', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'O que mais te incomoda?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Tédio, monotonia, rotina', emoji: '😴', scoreValue: { sanguine: 2 } },
              { text: 'Injustiça, obstáculos, lentidão', emoji: '😤', scoreValue: { choleric: 2 } },
              { text: 'Críticas, incompreensão, barulho', emoji: '😔', scoreValue: { melancholic: 2 } },
              { text: 'Mudanças bruscas, pressão, conflitos', emoji: '😰', scoreValue: { phlegmatic: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Aspectos Mentais',
        iconEmoji: '🧠',
        description: 'Padrões de pensamento',
        questions: [
          {
            text: 'Como você pensa e processa informação?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Rápido, muitas ideias, pulo de assunto', emoji: '⚡', scoreValue: { sanguine: 2 } },
              { text: 'Focado em objetivos e resultados', emoji: '🎯', scoreValue: { choleric: 2 } },
              { text: 'Profundo, analítico, perfeccionista', emoji: '🔬', scoreValue: { melancholic: 2 } },
              { text: 'Calmo, metódico, passo a passo', emoji: '📝', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'Qual sua relação com o tempo?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Vivo o presente, esqueço compromissos', emoji: '🎪', scoreValue: { sanguine: 2 } },
              { text: 'Impaciente, quero tudo para ontem', emoji: '⏰', scoreValue: { choleric: 2 } },
              { text: 'Penso muito no passado', emoji: '📚', scoreValue: { melancholic: 2 } },
              { text: 'Não tenho pressa, tudo tem seu tempo', emoji: '🌅', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'Como você toma decisões?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'No impulso, depois vejo', emoji: '🎲', scoreValue: { sanguine: 2 } },
              { text: 'Rápido e decidido', emoji: '✅', scoreValue: { choleric: 2 } },
              { text: 'Analiso muito, às vezes demais', emoji: '🤔', scoreValue: { melancholic: 2 } },
              { text: 'Preciso de tempo, não gosto de pressão', emoji: '⏳', scoreValue: { phlegmatic: 2 } }
            ]
          }
        ]
      },
      {
        name: 'Hábitos e Rotina',
        iconEmoji: '📅',
        description: 'Seu dia a dia',
        questions: [
          {
            text: 'Como é seu quarto/espaço de trabalho?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Colorido, cheio de coisas, um pouco bagunçado', emoji: '🎨', scoreValue: { sanguine: 2 } },
              { text: 'Funcional, organizado para eficiência', emoji: '📊', scoreValue: { choleric: 2 } },
              { text: 'Organizado, cada coisa no lugar, minimalista', emoji: '🗃️', scoreValue: { melancholic: 2 } },
              { text: 'Confortável, aconchegante, acolhedor', emoji: '🛋️', scoreValue: { phlegmatic: 2 } }
            ]
          },
          {
            text: 'Seu apetite é:',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Variável, como quando lembro, belisco', emoji: '🍿', scoreValue: { sanguine: 2 } },
              { text: 'Forte, como rápido para voltar ao trabalho', emoji: '🍖', scoreValue: { choleric: 2 } },
              { text: 'Fraco ou irregular, esqueço de comer', emoji: '🥗', scoreValue: { melancholic: 2 } },
              { text: 'Bom e regular, gosto de comer bem', emoji: '🍽️', scoreValue: { phlegmatic: 2 } }
            ]
          }
        ]
      }
    ]
  },

  // ==========================================
  // QUESTIONÁRIO INTEGRATIVO UNIVERSAL
  // ==========================================
  UNIVERSAL_INTEGRATIVE: {
    name: 'Anamnese Integrativa Universal',
    description: 'Questionário unificado que avalia simultaneamente Ayurveda, MTC, Homeopatia e Antroposofia em apenas 25 perguntas',
    patientIntro: `✨ **Bem-vindo à Anamnese Integrativa Universal!**

Este questionário especial foi desenvolvido para compreender você de forma holística, integrando sabedorias milenares de diferentes tradições médicas:

🌿 **Ayurveda** (Índia) - Sua constituição energética
☯️ **Medicina Tradicional Chinesa** - Seu equilíbrio de elementos
🌸 **Homeopatia** - Suas modalidades individuais
🌟 **Antroposofia** - Seu temperamento

Em apenas **15-20 minutos**, você nos ajudará a criar um perfil completo da sua saúde.

💡 **Dica:** Responda pensando em como você é na MAIOR PARTE do tempo, não em momentos específicos ou crises.`,
    therapeuticSystem: 'GENERAL',
    estimatedMinutes: 18,
    themeColor: '#6366F1',
    iconEmoji: '✨',
    aiAnalysisPrompt: `Analise as respostas de forma integrada para os 4 sistemas terapêuticos:

1. **AYURVEDA**: Calcule percentuais de Vata, Pitta, Kapha. Identifique Prakriti (constituição) e possível Vikriti (desequilíbrio atual).

2. **MTC**: Avalie equilíbrio Yin/Yang, identifique elemento predominante (Madeira, Fogo, Terra, Metal, Água) e possíveis padrões de desarmonia nos Zang-Fu.

3. **HOMEOPATIA**: Identifique modalidades térmicas (calorento/friorento), de movimento, horários de agravação, e possíveis constituições homeopáticas.

4. **ANTROPOSOFIA**: Determine temperamento predominante (Sanguíneo, Colérico, Melancólico, Fleumático) e secundário.

5. **SÍNTESE INTEGRATIVA**: Correlacione os achados entre os sistemas e identifique padrões convergentes que reforçam o diagnóstico.

Forneça recomendações práticas de estilo de vida, alimentação e terapias que sejam coerentes entre todos os sistemas.`,
    scoringLogic: {
      type: 'multi_system',
      systems: {
        ayurveda: ['vata', 'pitta', 'kapha'],
        tcm: ['wood', 'fire', 'earth', 'metal', 'water', 'yin', 'yang'],
        anthroposophy: ['sanguine', 'choleric', 'melancholic', 'phlegmatic'],
        homeopathy: ['hot', 'cold', 'dry', 'wet']
      }
    },
    categories: [
      {
        name: 'Constituição Física',
        iconEmoji: '🧬',
        description: 'Como é seu corpo naturalmente',
        questions: [
          {
            text: 'Qual descrição melhor representa sua estrutura corporal?',
            helpText: 'Pense em como seu corpo sempre foi, desde a juventude',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Magro, leve, ossos finos, difícil ganhar peso', emoji: '🦋', scoreValue: { vata: 2, sanguine: 1, wood: 1 } },
              { text: 'Médio, atlético, bem definido, musculatura visível', emoji: '🔥', scoreValue: { pitta: 2, choleric: 2, fire: 2 } },
              { text: 'Sólido, forte, tendência a ganhar peso facilmente', emoji: '🏔️', scoreValue: { kapha: 2, phlegmatic: 2, earth: 2, water: 1 } },
              { text: 'Alongado, magro, pensativo, cabeça grande', emoji: '🌙', scoreValue: { vata: 1, melancholic: 2, metal: 1 } }
            ]
          },
          {
            text: 'Como é sua pele naturalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Seca, fina, fria, às vezes áspera', emoji: '🏜️', scoreValue: { vata: 2, cold: 1, dry: 1, melancholic: 1 } },
              { text: 'Quente, oleosa, sensível, tendência a vermelhidão', emoji: '☀️', scoreValue: { pitta: 2, hot: 2, fire: 1, choleric: 1 } },
              { text: 'Grossa, oleosa, macia, fria ao toque', emoji: '💧', scoreValue: { kapha: 2, cold: 1, wet: 1, phlegmatic: 1 } },
              { text: 'Mista, normal na maior parte', emoji: '🌿', scoreValue: { earth: 1 } }
            ]
          },
          {
            text: 'Como você descreveria seus olhos?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Pequenos, secos, inquietos, piscam muito', emoji: '👀', scoreValue: { vata: 2, sanguine: 1, wood: 1 } },
              { text: 'Penetrantes, brilhantes, sensíveis à luz', emoji: '✨', scoreValue: { pitta: 2, choleric: 1, fire: 2 } },
              { text: 'Grandes, calmos, úmidos, cílios longos', emoji: '🌸', scoreValue: { kapha: 2, phlegmatic: 1, water: 1 } },
              { text: 'Profundos, contemplativos, expressivos', emoji: '🔮', scoreValue: { melancholic: 2, metal: 1, yin: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Temperatura e Clima',
        iconEmoji: '🌡️',
        description: 'Sua relação com temperatura e ambiente',
        questions: [
          {
            text: 'Você é naturalmente mais calorento ou friorento?',
            type: 'SCALE',
            scaleMin: 1,
            scaleMax: 10,
            scaleMinLabel: '❄️ Muito friorento',
            scaleMaxLabel: '🔥 Muito calorento',
            scoreMapping: {
              low: { vata: 2, kapha: 1, cold: 2, yin: 2, phlegmatic: 1, melancholic: 1 },
              high: { pitta: 2, hot: 2, yang: 2, choleric: 2, fire: 2 }
            }
          },
          {
            text: 'Qual clima você mais DETESTA?',
            helpText: 'O clima que mais te incomoda fisicamente',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Frio e ventoso - me deixa dolorido', emoji: '🌬️', scoreValue: { vata: 2, cold: 1, wood: 1 } },
              { text: 'Calor intenso - fico irritado e vermelho', emoji: '🥵', scoreValue: { pitta: 2, hot: 1, fire: 1, choleric: 1 } },
              { text: 'Úmido e frio - me deixa pesado e congestionado', emoji: '🌧️', scoreValue: { kapha: 2, wet: 1, water: 1, phlegmatic: 1 } },
              { text: 'Tempo seco - resseca minha pele e mucosas', emoji: '🏜️', scoreValue: { dry: 2, metal: 1, vata: 1 } }
            ]
          },
          {
            text: 'Suas mãos e pés geralmente são:',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Frios e secos', emoji: '🥶', scoreValue: { vata: 2, cold: 2, yin: 1, melancholic: 1 } },
              { text: 'Quentes e úmidos (suados)', emoji: '🔥', scoreValue: { pitta: 2, hot: 2, yang: 1, choleric: 1 } },
              { text: 'Frios e úmidos', emoji: '💧', scoreValue: { kapha: 2, cold: 1, wet: 1, phlegmatic: 2, water: 1 } },
              { text: 'Quentes e secos', emoji: '☀️', scoreValue: { pitta: 1, fire: 1, dry: 1, sanguine: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Digestão e Metabolismo',
        iconEmoji: '🍽️',
        description: 'Como funciona seu sistema digestivo',
        questions: [
          {
            text: 'Como é seu apetite normalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular - às vezes muito, às vezes nenhum', emoji: '📊', scoreValue: { vata: 2, sanguine: 1, wood: 1 } },
              { text: 'Forte e regular - preciso comer na hora ou fico mal', emoji: '🔥', scoreValue: { pitta: 2, choleric: 1, fire: 2, yang: 1 } },
              { text: 'Moderado - posso pular refeições sem problema', emoji: '⚖️', scoreValue: { kapha: 2, phlegmatic: 1, earth: 1 } },
              { text: 'Fraco - como por obrigação, esqueço de comer', emoji: '🥗', scoreValue: { melancholic: 2, metal: 1, yin: 1 } }
            ]
          },
          {
            text: 'Como é sua digestão?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Irregular - gases, inchaço, prisão de ventre variável', emoji: '💨', scoreValue: { vata: 2, dry: 1, wood: 1, sanguine: 1 } },
              { text: 'Rápida - azia, refluxo, fezes soltas frequentes', emoji: '🌋', scoreValue: { pitta: 2, hot: 1, fire: 2, choleric: 1 } },
              { text: 'Lenta - pesada após comer, sonolência', emoji: '🐢', scoreValue: { kapha: 2, wet: 1, earth: 2, phlegmatic: 2 } },
              { text: 'Sensível - intolerâncias, desconforto frequente', emoji: '😣', scoreValue: { melancholic: 1, metal: 1, vata: 1 } }
            ]
          },
          {
            text: 'Qual sua relação com a sede?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Variável - às vezes esqueço de beber água', emoji: '🏜️', scoreValue: { vata: 2, dry: 1 } },
              { text: 'Muita sede - bebo água frequentemente', emoji: '💦', scoreValue: { pitta: 2, hot: 1, fire: 1, yang: 1 } },
              { text: 'Pouca sede - preciso me lembrar de beber', emoji: '🥛', scoreValue: { kapha: 2, wet: 1, yin: 1 } },
              { text: 'Normal - bebo quando tenho sede', emoji: '💧', scoreValue: { earth: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Sono e Energia',
        iconEmoji: '😴',
        description: 'Seus padrões de descanso e vitalidade',
        questions: [
          {
            text: 'Como é seu sono naturalmente?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Leve, acordo fácil, muitos sonhos, insônia frequente', emoji: '🦋', scoreValue: { vata: 2, sanguine: 1, wood: 1, yang: 1 } },
              { text: 'Moderado, acordo alerta, durmo bem quando não estressado', emoji: '⚡', scoreValue: { pitta: 2, choleric: 1, fire: 1 } },
              { text: 'Profundo e longo, difícil acordar, gosto de dormir muito', emoji: '🐻', scoreValue: { kapha: 2, phlegmatic: 2, water: 1, yin: 2 } },
              { text: 'Irregular, insônia com pensamentos, dificuldade relaxar', emoji: '🌙', scoreValue: { melancholic: 2, metal: 1, vata: 1 } }
            ]
          },
          {
            text: 'Em que período do dia você tem mais energia?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Manhã cedo - acordo cheio de energia', emoji: '🌅', scoreValue: { vata: 1, sanguine: 2, wood: 1, yang: 1 } },
              { text: 'Meio do dia - meu pico é entre 10h-14h', emoji: '☀️', scoreValue: { pitta: 2, fire: 2, choleric: 1 } },
              { text: 'Tarde/noite - demoro para pegar no tranco', emoji: '🌙', scoreValue: { kapha: 2, water: 1, phlegmatic: 1, yin: 1 } },
              { text: 'Variável - não tenho padrão definido', emoji: '🔄', scoreValue: { vata: 2, sanguine: 1 } }
            ]
          },
          {
            text: 'Como você se sente ao acordar?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Já pensando em mil coisas, ansioso', emoji: '🧠', scoreValue: { vata: 2, sanguine: 1, wood: 1 } },
              { text: 'Alerta, pronto para ação, às vezes irritado', emoji: '⚡', scoreValue: { pitta: 2, choleric: 2, fire: 1, yang: 1 } },
              { text: 'Sonolento, preciso de tempo para despertar', emoji: '😴', scoreValue: { kapha: 2, phlegmatic: 2, water: 1, yin: 1 } },
              { text: 'Cansado mesmo dormindo bem, sem motivação', emoji: '😔', scoreValue: { melancholic: 2, metal: 1, yin: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Mente e Emoções',
        iconEmoji: '🧠',
        description: 'Seus padrões mentais e emocionais',
        questions: [
          {
            text: 'Qual emoção você sente com mais frequência?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Ansiedade, preocupação, medo do futuro', emoji: '😰', scoreValue: { vata: 2, sanguine: 1, wood: 1, water: 1 } },
              { text: 'Raiva, frustração, irritação, impaciência', emoji: '😤', scoreValue: { pitta: 2, choleric: 2, fire: 2, wood: 2 } },
              { text: 'Apego, possessividade, resistência a mudanças', emoji: '🤗', scoreValue: { kapha: 2, phlegmatic: 1, earth: 2 } },
              { text: 'Tristeza, melancolia, nostalgia, reflexão', emoji: '😢', scoreValue: { melancholic: 2, metal: 2, yin: 1, vata: 1 } }
            ]
          },
          {
            text: 'Como você lida com estresse?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Fico ansioso, falo muito, não consigo parar', emoji: '🗣️', scoreValue: { vata: 2, sanguine: 2, wood: 1 } },
              { text: 'Fico irritado, bravo, quero resolver logo', emoji: '💢', scoreValue: { pitta: 2, choleric: 2, fire: 2 } },
              { text: 'Fico parado, evito, me retraio, como mais', emoji: '🐚', scoreValue: { kapha: 2, phlegmatic: 2, earth: 1 } },
              { text: 'Fico triste, me isolo, penso demais', emoji: '🌧️', scoreValue: { melancholic: 2, metal: 2, water: 1 } }
            ]
          },
          {
            text: 'Como é sua memória?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Aprendo rápido mas esqueço rápido', emoji: '⚡', scoreValue: { vata: 2, sanguine: 2, fire: 1 } },
              { text: 'Boa, especialmente para fatos e detalhes', emoji: '📊', scoreValue: { pitta: 2, choleric: 1, wood: 1 } },
              { text: 'Demoro a aprender mas não esqueço', emoji: '🐘', scoreValue: { kapha: 2, phlegmatic: 1, earth: 2 } },
              { text: 'Boa para sentimentos e experiências passadas', emoji: '💭', scoreValue: { melancholic: 2, water: 1, metal: 1 } }
            ]
          },
          {
            text: 'Em um grupo social, você geralmente:',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'É animado, fala com todos, muda de assunto', emoji: '🎉', scoreValue: { vata: 1, sanguine: 2, fire: 1 } },
              { text: 'Lidera, organiza, debate, defende opiniões', emoji: '👑', scoreValue: { pitta: 1, choleric: 2, wood: 1 } },
              { text: 'Fica tranquilo, ouve mais, fala se perguntado', emoji: '🧘', scoreValue: { kapha: 1, phlegmatic: 2, earth: 1 } },
              { text: 'Observa, analisa, participa seletivamente', emoji: '🔭', scoreValue: { melancholic: 2, metal: 1, water: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Movimento e Atividade',
        iconEmoji: '🏃',
        description: 'Como você se move e se exercita',
        questions: [
          {
            text: 'Como é seu ritmo natural de movimento?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Rápido, inquieto, não consigo ficar parado', emoji: '🦋', scoreValue: { vata: 2, sanguine: 2, wood: 1, yang: 1 } },
              { text: 'Decidido, forte, objetivo, direto ao ponto', emoji: '🎯', scoreValue: { pitta: 2, choleric: 2, fire: 1 } },
              { text: 'Lento, estável, gracioso, econômico', emoji: '🐢', scoreValue: { kapha: 2, phlegmatic: 2, earth: 1, yin: 1 } },
              { text: 'Hesitante, cuidadoso, pensativo', emoji: '🚶', scoreValue: { melancholic: 2, metal: 1, water: 1 } }
            ]
          },
          {
            text: 'Seus sintomas geralmente melhoram com:',
            helpText: 'Pense em dores, desconfortos, mal-estar',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Calor e repouso - preciso me aquecer e descansar', emoji: '🛋️', scoreValue: { vata: 2, cold: 2, yin: 1 } },
              { text: 'Frio e repouso - preciso resfriar e parar', emoji: '🧊', scoreValue: { pitta: 2, hot: 2, yang: 1 } },
              { text: 'Movimento e calor - preciso me mexer e aquecer', emoji: '🏃', scoreValue: { kapha: 2, cold: 1, wet: 1, yin: 1 } },
              { text: 'Depende - varia conforme o sintoma', emoji: '🔄', scoreValue: { vata: 1 } }
            ]
          }
        ]
      },
      {
        name: 'Preferências e Estilo',
        iconEmoji: '🎨',
        description: 'Suas preferências pessoais',
        questions: [
          {
            text: 'Que tipo de atividade você mais gosta?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Atividades variadas, criativas, que mudam', emoji: '🎨', scoreValue: { vata: 2, sanguine: 2, wood: 1 } },
              { text: 'Competitivas, desafiadoras, com resultados', emoji: '🏆', scoreValue: { pitta: 2, choleric: 2, fire: 2 } },
              { text: 'Tranquilas, relaxantes, em grupo', emoji: '🧘', scoreValue: { kapha: 2, phlegmatic: 2, earth: 1 } },
              { text: 'Intelectuais, artísticas, solitárias', emoji: '📚', scoreValue: { melancholic: 2, metal: 2, water: 1 } }
            ]
          },
          {
            text: 'O que mais te incomoda em outras pessoas?',
            type: 'SINGLE_CHOICE',
            options: [
              { text: 'Monotonia, lentidão, falta de novidade', emoji: '😴', scoreValue: { sanguine: 2, vata: 1, fire: 1 } },
              { text: 'Incompetência, injustiça, falta de eficiência', emoji: '😤', scoreValue: { choleric: 2, pitta: 1, wood: 1 } },
              { text: 'Mudanças bruscas, pressão, conflitos', emoji: '😰', scoreValue: { phlegmatic: 2, kapha: 1, earth: 1 } },
              { text: 'Superficialidade, barulho, falta de profundidade', emoji: '😔', scoreValue: { melancholic: 2, metal: 1, water: 1 } }
            ]
          },
          {
            text: 'Qual seu maior desafio de saúde recorrente?',
            type: 'MULTIPLE_CHOICE',
            helpText: 'Selecione todos que se aplicam',
            options: [
              { text: 'Ansiedade, insônia, dores articulares', emoji: '😰', scoreValue: { vata: 2, wood: 1 } },
              { text: 'Inflamações, problemas de pele, azia', emoji: '🔥', scoreValue: { pitta: 2, fire: 2 } },
              { text: 'Congestão, ganho de peso, letargia', emoji: '😴', scoreValue: { kapha: 2, earth: 1, water: 1 } },
              { text: 'Problemas respiratórios, tristeza, constipação', emoji: '🫁', scoreValue: { metal: 2, melancholic: 1 } },
              { text: 'Dores lombares, problemas urinários, fadiga', emoji: '💧', scoreValue: { water: 2, yin: 1 } }
            ]
          }
        ]
      }
    ]
  }

  ,

  INTEGRATIVE_PRECONSULT: {
    name: 'Questionário Integrativo – Anamnese Pré-Consulta',
    description: 'Anamnese pré-consulta integrativa (corpo, mente, emoções, biografia e contexto).',
    patientIntro:
      'Este questionário tem como objetivo ampliar a compreensão do seu processo de saúde-doença de forma integral (corpo, mente, emoções, biografia e contexto). Ele não substitui a consulta, mas permite que ela seja mais profunda, acolhedora e eficiente.\n\nResponda com calma, honestidade e no seu tempo. Não há respostas certas ou erradas.',
    therapeuticSystem: 'GENERAL',
    estimatedMinutes: 30,
    iconEmoji: '📝',
    categories: [
      {
        name: 'Identificação e contexto',
        iconEmoji: '🪪',
        description: 'Informações gerais e rotina',
        questions: [
          { text: 'Nome completo:', type: 'TEXT', isRequired: false },
          { text: 'Data de nascimento:', type: 'TEXT', isRequired: false },
          { text: 'Profissão / atividade principal:', type: 'TEXT', isRequired: false },
          { text: 'Estado civil / configuração familiar:', type: 'TEXT', isRequired: false },
          { text: 'Quem mora com você?', type: 'TEXT', isRequired: false },
          { text: 'Como é um dia típico na sua vida?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Queixa principal e objetivos',
        iconEmoji: '🎯',
        description: 'Motivação e metas',
        questions: [
          { text: 'O que motivou você a buscar esta consulta agora?', type: 'TEXT', isRequired: false },
          { text: 'Quando isso começou?', type: 'TEXT', isRequired: false },
          { text: 'O que você espera do acompanhamento integrativo?', type: 'TEXT', isRequired: false },
          { text: 'Se sua saúde estivesse ideal daqui a 1 ano, como ela estaria?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'História da condição atual',
        iconEmoji: '🩺',
        description: 'Sintomas e fatores associados',
        questions: [
          { text: 'Descreva seus sintomas principais:', type: 'TEXT', isRequired: false },
          { text: 'Intensidade (0–10):', type: 'SCALE', isRequired: false, scaleMin: 0, scaleMax: 10 },
          { text: 'Frequência:', type: 'TEXT', isRequired: false },
          { text: 'O que melhora?', type: 'TEXT', isRequired: false },
          { text: 'O que piora?', type: 'TEXT', isRequired: false },
          { text: 'Há relação com emoções, clima, alimentação, ciclo menstrual, estresse ou horários do dia?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Antecedentes pessoais',
        iconEmoji: '📚',
        description: 'Histórico médico e uso de medicamentos',
        questions: [
          { text: 'Doenças importantes ao longo da vida:', type: 'TEXT', isRequired: false },
          { text: 'Internações / cirurgias:', type: 'TEXT', isRequired: false },
          { text: 'Traumas físicos relevantes:', type: 'TEXT', isRequired: false },
          { text: 'Uso atual de medicamentos (dose e horário):', type: 'TEXT', isRequired: false },
          { text: 'Uso prévio de medicamentos de longo prazo:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Antecedentes familiares',
        iconEmoji: '👨‍👩‍👧‍👦',
        description: 'Histórico familiar relevante',
        questions: [
          { text: 'Doenças relevantes em familiares (pais, avós, irmãos):', type: 'TEXT', isRequired: false },
          { text: 'Padrões repetitivos (ex.: câncer, depressão, diabetes, doenças autoimunes):', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Sono',
        iconEmoji: '😴',
        description: 'Qualidade do sono e hábitos',
        questions: [
          { text: 'Horário que dorme / acorda:', type: 'TEXT', isRequired: false },
          { text: 'Qualidade do sono:', type: 'TEXT', isRequired: false },
          { text: 'Sonhos frequentes?', type: 'YES_NO', isRequired: false },
        ],
      },
      {
        name: 'Alimentação',
        iconEmoji: '🍽️',
        description: 'Hábitos alimentares',
        questions: [
          { text: 'Como você descreveria sua alimentação?', type: 'TEXT', isRequired: false },
          { text: 'Horários das refeições:', type: 'TEXT', isRequired: false },
          { text: 'Preferências e aversões alimentares:', type: 'TEXT', isRequired: false },
          { text: 'Consumo de açúcar, café, álcool, ultraprocessados:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Atividade física',
        iconEmoji: '🏃',
        description: 'Rotina de exercícios',
        questions: [
          { text: 'Tipo:', type: 'TEXT', isRequired: false },
          { text: 'Frequência:', type: 'TEXT', isRequired: false },
          { text: 'Como se sente após se exercitar?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Digestão e eliminação',
        iconEmoji: '🧻',
        description: 'Sintomas digestivos e eliminação',
        questions: [
          { text: 'Apetite:', type: 'TEXT', isRequired: false },
          { text: 'Estufamento / gases:', type: 'TEXT', isRequired: false },
          { text: 'Azia / refluxo:', type: 'TEXT', isRequired: false },
          { text: 'Funcionamento intestinal:', type: 'TEXT', isRequired: false },
          { text: 'Características das fezes:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Aspectos emocionais e mentais',
        iconEmoji: '🧠',
        description: 'Emoções, estresse e enfrentamento',
        questions: [
          { text: 'Como você descreveria seu estado emocional atual?', type: 'TEXT', isRequired: false },
          { text: 'Ansiedade, tristeza, irritabilidade, apatia?', type: 'TEXT', isRequired: false },
          { text: 'Eventos marcantes recentes:', type: 'TEXT', isRequired: false },
          { text: 'Como você lida com conflitos?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Espiritualidade e sentido',
        iconEmoji: '🕊️',
        description: 'Práticas e propósito',
        questions: [
          { text: 'Você possui alguma prática espiritual ou religiosa?', type: 'TEXT', isRequired: false },
          { text: 'O que dá sentido à sua vida hoje?', type: 'TEXT', isRequired: false },
          { text: 'Você sente que está alinhado(a) com seu propósito?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Anamnese Antroposófica',
        iconEmoji: '🌿',
        description: 'Perguntas específicas - Antroposofia',
        questions: [
          { text: 'Como você percebe o ritmo na sua vida (sono, alimentação, trabalho, lazer)?', type: 'TEXT', isRequired: false },
          { text: 'Você se considera mais ativo(a) ou mais contemplativo(a)?', type: 'TEXT', isRequired: false },
          { text: 'Sensação predominante: calor ou frio?', type: 'TEXT', isRequired: false },
          { text: 'Como reage a doenças (febre alta, prostração, pouca reação)?', type: 'TEXT', isRequired: false },
          { text: 'Doenças marcantes na infância?', type: 'TEXT', isRequired: false },
          { text: 'Eventos biográficos importantes por fases da vida (0–7 / 7–14 / 14–21 / adulto):', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Anamnese Ayurvédica',
        iconEmoji: '🕉️',
        description: 'Perguntas específicas - Ayurveda',
        questions: [
          { text: 'Corpo mais leve/seco ou pesado/úmido?', type: 'TEXT', isRequired: false },
          { text: 'Tendência a frio ou calor?', type: 'TEXT', isRequired: false },
          { text: 'Pele seca, oleosa ou mista?', type: 'TEXT', isRequired: false },
          { text: 'Fome regular?', type: 'TEXT', isRequired: false },
          { text: 'Digestão lenta ou rápida?', type: 'TEXT', isRequired: false },
          { text: 'Sonolência após comer?', type: 'TEXT', isRequired: false },
          { text: 'Ansiedade, medo, insônia (Vata)?', type: 'TEXT', isRequired: false },
          { text: 'Irritabilidade, inflamação, calor (Pitta)?', type: 'TEXT', isRequired: false },
          { text: 'Letargia, ganho de peso, apego (Kapha)?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Anamnese Homeopática',
        iconEmoji: '⚗️',
        description: 'Perguntas específicas - Homeopatia',
        questions: [
          { text: 'Sintoma mais incômodo (descreva detalhadamente):', type: 'TEXT', isRequired: false },
          { text: 'Sensações específicas (pontada, queimação, peso, vazio):', type: 'TEXT', isRequired: false },
          { text: 'Modalidades: melhora/piora com frio, calor, repouso, movimento?', type: 'TEXT', isRequired: false },
          { text: 'Horário do dia em que piora:', type: 'TEXT', isRequired: false },
          { text: 'Medos marcantes:', type: 'TEXT', isRequired: false },
          { text: 'Sonhos recorrentes:', type: 'TEXT', isRequired: false },
          { text: 'Padrões emocionais desde a infância:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Anamnese de Medicina Chinesa (MTC)',
        iconEmoji: '☯️',
        description: 'Perguntas específicas - MTC',
        questions: [
          { text: 'Sensação de frio ou calor nas extremidades?', type: 'TEXT', isRequired: false },
          { text: 'Sudorese (espontânea, noturna, ausente):', type: 'TEXT', isRequired: false },
          { text: 'Sede (muita, pouca, prefere quente/frio):', type: 'TEXT', isRequired: false },
          { text: 'Emoção predominante (raiva, preocupação, medo, tristeza):', type: 'TEXT', isRequired: false },
          { text: 'Dores: local, tipo, migração:', type: 'TEXT', isRequired: false },
          { text: 'Ritmo intestinal e urinário:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Fitoterapia (Ervas Brasileiras e do Mundo)',
        iconEmoji: '🌱',
        description: 'Uso prévio de plantas e sensibilidade',
        questions: [
          { text: 'Já utilizou plantas medicinais?', type: 'TEXT', isRequired: false },
          { text: 'Quais fizeram bem?', type: 'TEXT', isRequired: false },
          { text: 'Quais não tolerou?', type: 'TEXT', isRequired: false },
          { text: 'Uso de chás no dia a dia:', type: 'TEXT', isRequired: false },
          { text: 'Sensibilidade a aromas, amargos, estimulantes ou sedativos:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Acupuntura',
        iconEmoji: '🪡',
        description: 'Sintomas e histórico relevantes para acupuntura',
        questions: [
          { text: 'Dores crônicas?', type: 'TEXT', isRequired: false },
          { text: 'Pontos sensíveis ao toque?', type: 'TEXT', isRequired: false },
          { text: 'Histórico de traumas energéticos (quedas, acidentes, cirurgias):', type: 'TEXT', isRequired: false },
          { text: 'Sensação de bloqueio ou estagnação em alguma região do corpo?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Astromedicina',
        iconEmoji: '🪐',
        description: 'Dados e eventos relacionados à biografia',
        questions: [
          { text: 'Data, hora e local de nascimento (se souber):', type: 'TEXT', isRequired: false },
          { text: 'Eventos de saúde marcantes ao longo da vida (idade aproximada):', type: 'TEXT', isRequired: false },
          { text: 'Fases da vida com mais adoecimento ou expansão:', type: 'TEXT', isRequired: false },
          { text: 'Você percebe relação entre crises de saúde e fases emocionais?', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Ortomolecular / Metabólica',
        iconEmoji: '🧬',
        description: 'Sinais, sintomas e exames',
        questions: [
          { text: 'Fadiga persistente?', type: 'TEXT', isRequired: false },
          { text: 'Queda de cabelo?', type: 'TEXT', isRequired: false },
          { text: 'Unhas fracas?', type: 'TEXT', isRequired: false },
          { text: 'Cãibras, tremores, formigamentos?', type: 'TEXT', isRequired: false },
          { text: 'Infecções de repetição?', type: 'TEXT', isRequired: false },
          { text: 'Uso prévio de suplementos:', type: 'TEXT', isRequired: false },
          { text: 'Exames laboratoriais recentes:', type: 'TEXT', isRequired: false },
        ],
      },
      {
        name: 'Encerramento',
        iconEmoji: '✅',
        description: 'Perguntas finais',
        questions: [
          { text: 'Há algo importante sobre você que não foi perguntado?', type: 'TEXT', isRequired: false },
          { text: 'Algo que você sente que seu corpo quer comunicar?', type: 'TEXT', isRequired: false },
        ],
      },
    ],
  },

  INTEGRATIVE_MOBILE_SIMPLE: {
    name: 'Questionário Integrativo – Pré-Consulta (Mobile)',
    description: 'Versão mobile, simples e objetiva para triagem e preparação pré-consulta.',
    patientIntro:
      'Este questionário é rápido e ajuda a entender como você está hoje. Responda no seu tempo. Ao final, suas respostas serão analisadas com atenção antes da consulta.',
    therapeuticSystem: 'GENERAL',
    estimatedMinutes: 10,
    iconEmoji: '📱',
    categories: [
      {
        name: 'Como você está hoje',
        iconEmoji: '🟦',
        description: 'Triagem rápida',
        questions: [
          {
            text: 'Como está sua energia na maior parte dos dias?',
            type: 'SCALE',
            isRequired: true,
            scaleMin: 0,
            scaleMax: 10,
            scaleMinLabel: 'Muito baixa',
            scaleMaxLabel: 'Muito alta',
          },
          {
            text: 'Seu sono costuma ser:',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Profundo e reparador' },
              { text: 'Leve, acordo fácil' },
              { text: 'Acordo várias vezes' },
              { text: 'Dificuldade para dormir' },
              { text: 'Muito irregular' },
            ],
          },
          {
            text: 'Seu ritmo diário costuma ser:',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Acelerado / corrido' },
              { text: 'Equilibrado' },
              { text: 'Lento / com cansaço fácil' },
            ],
          },
        ],
      },
      {
        name: 'Corpo e funções',
        iconEmoji: '🟩',
        description: 'Sinais físicos e funções do corpo',
        questions: [
          {
            text: 'Você costuma sentir mais:',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Frio' },
              { text: 'Calor' },
              { text: 'Oscila entre frio e calor' },
              { text: 'Normal' },
            ],
          },
          {
            text: 'Após as refeições, você geralmente sente:',
            type: 'MULTIPLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Leveza' },
              { text: 'Estufamento' },
              { text: 'Sonolência' },
              { text: 'Azia / queimação' },
              { text: 'Nada de diferente' },
            ],
          },
          {
            text: 'Seu intestino funciona:',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Todos os dias, sem esforço' },
              { text: 'Preso' },
              { text: 'Solto' },
              { text: 'Irregular' },
            ],
          },
          {
            text: 'Você sente com frequência:',
            type: 'MULTIPLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Dores no corpo' },
              { text: 'Tensão muscular' },
              { text: 'Inchaço' },
              { text: 'Cansaço excessivo' },
              { text: 'Nenhuma dessas' },
            ],
          },
        ],
      },
      {
        name: 'Emoções e mente',
        iconEmoji: '🟪',
        description: 'Últimos 3 meses',
        questions: [
          {
            text: 'Quais emoções têm aparecido com mais frequência?',
            type: 'MULTIPLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Ansiedade / medo' },
              { text: 'Irritação / impaciência' },
              { text: 'Tristeza' },
              { text: 'Preocupação excessiva' },
              { text: 'Desânimo / apatia' },
              { text: 'Estabilidade emocional' },
            ],
          },
          {
            text: 'Em situações de estresse, você tende a:',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            options: [
              { text: 'Ficar agitado(a)' },
              { text: 'Ficar irritado(a)' },
              { text: 'Se fechar / cansar' },
              { text: 'Lidar bem, na maior parte do tempo' },
            ],
          },
        ],
      },
      {
        name: 'História de saúde',
        iconEmoji: '🟧',
        description: 'Objetivo e direto',
        questions: [
          {
            text: 'Você usa medicamentos de forma contínua?',
            type: 'YES_NO',
            isRequired: true,
          },
          {
            text: 'Se sim, quais medicamentos e doses? (opcional)',
            helpText: 'Preencha apenas se você respondeu “Sim” na pergunta anterior.',
            type: 'TEXT',
            isRequired: false,
          },
          {
            text: 'Usa suplementos, chás ou plantas medicinais com frequência?',
            type: 'YES_NO',
            isRequired: true,
          },
          {
            text: 'Já teve alguma doença importante ao longo da vida?',
            type: 'YES_NO',
            isRequired: true,
          },
        ],
      },
      {
        name: 'Sentido e percepção',
        iconEmoji: '🟨',
        description: 'Como você percebe seu momento atual',
        questions: [
          {
            text: 'Você sente que sua vida hoje tem sentido e direção?',
            type: 'SCALE',
            isRequired: true,
            scaleMin: 0,
            scaleMax: 10,
            scaleMinLabel: 'Nenhum',
            scaleMaxLabel: 'Muito claro',
          },
        ],
      },
      {
        name: 'Perguntas abertas',
        iconEmoji: '✍️',
        description: 'Apenas 3 perguntas curtas',
        questions: [
          {
            text: 'O que te motivou a buscar esta consulta agora?',
            type: 'TEXT',
            isRequired: true,
          },
          {
            text: 'O que você espera desse acompanhamento?',
            type: 'TEXT',
            isRequired: true,
          },
          {
            text: 'Se seu corpo pudesse falar, o que ele estaria pedindo neste momento?',
            type: 'TEXT',
            isRequired: true,
          },
        ],
      },
    ],
  }
}

// POST - Criar templates built-in (seed)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissão: este endpoint apenas faz seed de templates built-in (hardcoded).
    // Permitimos ADMIN e DOCTOR para facilitar o uso em produção (idempotente).
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user?.role || !['ADMIN', 'DOCTOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Apenas administradores ou médicos podem carregar templates do sistema' }, { status: 403 })
    }

    const results = []

    for (const [key, template] of Object.entries(BUILTIN_TEMPLATES)) {
      // Verificar se já existe
      const existing = await prisma.questionnaireTemplate.findFirst({
        where: { 
          name: template.name,
          isBuiltIn: true
        }
      })

      if (existing) {
        results.push({ key, status: 'skipped', message: 'Já existe' })
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
            create: template.categories.map((cat: any, catIndex: number) => ({
              name: cat.name,
              description: cat.description,
              iconEmoji: cat.iconEmoji,
              order: catIndex,
              questions: {
                create: cat.questions.map((q: any, qIndex: number) => ({
                  text: q.text,
                  helpText: q.helpText,
                  type: q.type || 'SINGLE_CHOICE',
                  isRequired: q.isRequired ?? true,
                  order: qIndex,
                  scaleMin: q.scaleMin,
                  scaleMax: q.scaleMax,
                  scaleMinLabel: q.scaleMinLabel,
                  scaleMaxLabel: q.scaleMaxLabel,
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

      results.push({ key, status: 'created', name: template.name })
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: `${results.filter(r => r.status === 'created').length} templates criados`
    })

  } catch (error: any) {
    logger.error('Error seeding templates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Listar templates disponíveis para seed
export async function GET() {
  return NextResponse.json({
    availableTemplates: Object.keys(BUILTIN_TEMPLATES),
    descriptions: Object.fromEntries(
      Object.entries(BUILTIN_TEMPLATES).map(([key, t]) => [key, {
        name: t.name,
        system: t.therapeuticSystem,
        questions: (t.categories as any[]).reduce((acc: number, cat: any) => acc + (cat?.questions?.length ?? 0), 0)
      }])
    )
  })
}
