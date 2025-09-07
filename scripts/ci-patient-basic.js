// Script simples para validar criação/listagem de paciente em CI sem leaking de dados sensíveis
const { PrismaClient } = require('@prisma/client')

async function run(){
  const prisma = new PrismaClient()
  try {
    const countBefore = await prisma.patient.count()
    console.log('[ci-patient] before=', countBefore)
    if(!countBefore){
      await prisma.patient.create({
        data: {
          name: 'Paciente CI',
          email: 'paciente.ci@example.com',
          birthDate: new Date('1990-01-01'),
          gender: 'MALE'
        }
      })
    }
    const all = await prisma.patient.findMany()
    console.log('[ci-patient] after=', all.length)
  } catch(e){
    console.error('[ci-patient] FAILED', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run()
