import { PrismaClient, AIRequestType } from '@prisma/client'

const prisma = new PrismaClient()

/*
  Gera dados sintéticos de IA:
  - Para até 15 registros médicos cria AIAnalysis (se não existir)
  - Para o usuário admin cria 20 AIInteraction variadas
*/

function rand<T>(arr:T[]) { return arr[Math.floor(Math.random()*arr.length)] }

const analysisTypes = ['Resumo Clínico','Avaliação de Risco','Sugestão Diagnóstica','Normalização de Texto']
const suggestionsPool = [
  'Solicitar exame complementar',
  'Acompanhar em 30 dias',
  'Rever medicação atual',
  'Encaminhar para especialista',
  'Avaliar adesão ao tratamento'
]
const requestPrompts = [
  'Gerar resumo clínico condensado',
  'Avaliar risco metabólico',
  'Listar possíveis diagnósticos diferenciais',
  'Normalizar texto de evolução',
  'Gerar recomendação de acompanhamento'
]

async function main(){
  console.log('> Gerando análises de IA...')
  const medicalRecords = await prisma.medicalRecord.findMany({ take: 15, orderBy: { createdAt: 'desc' } })
  for (const record of medicalRecords){
    const existing = await prisma.aIAnalysis.findFirst({ where: { medicalRecordId: record.id } })
    if (existing) continue
    await prisma.aIAnalysis.create({
      data:{
        analysisType: rand(analysisTypes),
        input: record.description?.slice(0,200) || 'Sem descrição',
        result: 'Análise sintética gerada para demonstração.',
        confidence: rand([0.78,0.82,0.9,0.95]),
        suggestions: [rand(suggestionsPool), rand(suggestionsPool)],
        medicalRecordId: record.id
      }
    })
  }

  console.log('> Gerando interações de IA...')
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin){ console.log('Usuário admin não encontrado, abortando interações.'); return }

  for (let i=0;i<20;i++){
    const type = rand(Object.values(AIRequestType))
    await prisma.aIInteraction.create({
      data:{
        type,
        prompt: rand(requestPrompts),
        response: 'Resposta sintética para '+type,
        confidence: rand([0.7,0.8,0.85,0.9,0.95]),
        metadata: { synthetic: true, iteration: i }
      , userId: admin.id }
    })
  }

  console.log('> Concluído seed IA.')
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())
