import { PrismaClient, ExamStatus } from '@prisma/client'

const prisma = new PrismaClient()

/*
  Completa todos os ExamRequest com status REQUESTED ou SCHEDULED
  - Gera um ExamResult se ainda não existir
  - Atualiza status para COMPLETED e completedDate
*/

function rand<T>(arr:T[]) { return arr[Math.floor(Math.random()*arr.length)] }

const genericFindings = [
  'Dentro da normalidade.',
  'Leve variação sem relevância clínica.',
  'Recomenda-se acompanhamento em 6 meses.',
  'Sem sinais de processo inflamatório agudo.',
  'Valores laboratoriais estáveis.'
]

async function main(){
  console.log('> Buscando exames pendentes...')
  const pendentes = await prisma.examRequest.findMany({
    where: { status: { in: [ExamStatus.REQUESTED, ExamStatus.SCHEDULED] } },
    include: { patient: { select: { id:true, name:true } } }
  })

  if (pendentes.length === 0){
    console.log('Nenhum exame pendente para completar.')
    return
  }

  let completed = 0, createdResults = 0
  for (const exam of pendentes){
    const existingResult = await prisma.examResult.findFirst({ where: { patientId: exam.patientId, examType: exam.examType } })
    if (!existingResult){
      await prisma.examResult.create({
        data:{
          examType: exam.examType,
          results: JSON.stringify({ laudo: rand(genericFindings) }),
          examDate: new Date(),
          patientId: exam.patientId
        }
      })
      createdResults++
    }
    await prisma.examRequest.update({ where: { id: exam.id }, data: { status: ExamStatus.COMPLETED, completedDate: new Date() } })
    completed++
  }

  console.log('> Concluído.')
  console.log({ examRequestsCompleted: completed, newExamResults: createdResults })
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())
