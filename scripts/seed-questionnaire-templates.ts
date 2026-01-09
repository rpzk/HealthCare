// Script para fazer seed dos templates de questionário
// Execute com: npx tsx scripts/seed-questionnaire-templates.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Templates integrativos
const TEMPLATES: Record<string, any> = {
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
  }

  ,

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
          { text: 'Você usa medicamentos de forma contínua?', type: 'YES_NO', isRequired: true },
          {
            text: 'Se sim, quais medicamentos e doses? (opcional)',
            helpText: 'Preencha apenas se você respondeu “Sim” na pergunta anterior.',
            type: 'TEXT',
            isRequired: false,
          },
          { text: 'Usa suplementos, chás ou plantas medicinais com frequência?', type: 'YES_NO', isRequired: true },
          { text: 'Já teve alguma doença importante ao longo da vida?', type: 'YES_NO', isRequired: true },
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
          { text: 'O que te motivou a buscar esta consulta agora?', type: 'TEXT', isRequired: true },
          { text: 'O que você espera desse acompanhamento?', type: 'TEXT', isRequired: true },
          { text: 'Se seu corpo pudesse falar, o que ele estaria pedindo neste momento?', type: 'TEXT', isRequired: true },
        ],
      },
    ],
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
