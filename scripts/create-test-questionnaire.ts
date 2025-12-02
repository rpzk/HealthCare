// Script para criar dados de teste
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Criando dados de teste...\n')
  
  // Verificar se já existe paciente de teste
  let patient = await prisma.patient.findFirst({
    where: { email: 'maria.teste@example.com' }
  })
  
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: 'Maria Silva (Teste)',
        email: 'maria.teste@example.com',
        cpf: '12345678901',
        phone: '11999998888',
        birthDate: new Date('1985-03-15'),
        gender: 'FEMALE'
      }
    })
    console.log('✅ Paciente criado:', patient.name)
  } else {
    console.log('ℹ️  Paciente já existe:', patient.name)
  }
  
  // Buscar template Universal
  const template = await prisma.questionnaireTemplate.findFirst({
    where: { name: { contains: 'Universal' } }
  })
  
  if (!template) {
    console.log('❌ Template não encontrado. Execute o seed primeiro.')
    return
  }
  
  // Buscar usuário admin
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  
  if (!user) {
    console.log('❌ Usuário admin não encontrado.')
    return
  }
  
  // Verificar se já existe questionário pendente
  const existingQ = await prisma.patientQuestionnaire.findFirst({
    where: {
      patientId: patient.id,
      templateId: template.id,
      status: 'PENDING'
    }
  })
  
  if (existingQ) {
    console.log('ℹ️  Questionário pendente já existe')
    console.log('')
    console.log('📋 Link para o paciente responder:')
    console.log(`   http://localhost:3000/questionnaire/${existingQ.accessToken}`)
    return
  }
  
  // Criar questionário
  const questionnaire = await prisma.patientQuestionnaire.create({
    data: {
      templateId: template.id,
      patientId: patient.id,
      sentById: user.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })
  
  console.log('✅ Questionário enviado!')
  console.log('')
  console.log('='.repeat(60))
  console.log('📋 LINK PARA O PACIENTE RESPONDER:')
  console.log(`   http://localhost:3000/questionnaire/${questionnaire.accessToken}`)
  console.log('='.repeat(60))
  console.log('')
  console.log('👁️  Link para ver no admin:')
  console.log(`   http://localhost:3000/questionnaires/${template.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
