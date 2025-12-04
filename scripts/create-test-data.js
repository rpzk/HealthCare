const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Criando dados de teste...')

  // Criar médico de teste
  const doctor = await prisma.user.upsert({
    where: { email: 'medico@teste.com' },
    update: {},
    create: {
      email: 'medico@teste.com',
      name: 'Dr. João Silva',
      role: 'DOCTOR',
      speciality: 'Clínica Geral',
      password: await bcrypt.hash('123456', 12)
    }
  })
  console.log('Médico criado:', doctor.email)

  // Criar paciente
  const patient = await prisma.patient.create({
    data: {
      name: 'Ana Sacknies',
      email: 'anasacknies@gmail.com',
      cpf: '12345678900',
      birthDate: new Date('1990-05-15'),
      gender: 'FEMALE',
      phone: '11999998888'
    }
  })
  console.log('Paciente criado:', patient.id)

  // Criar usuário da paciente
  const patientUser = await prisma.user.upsert({
    where: { email: 'anasacknies@gmail.com' },
    update: { patientId: patient.id },
    create: {
      email: 'anasacknies@gmail.com',
      name: 'Ana Sacknies',
      role: 'PATIENT',
      password: await bcrypt.hash('123456', 12),
      patientId: patient.id
    }
  })
  console.log('Usuário paciente criado:', patientUser.email)

  console.log('\n=== DADOS DE TESTE CRIADOS COM SUCESSO ===')
  console.log('Logins disponíveis:')
  console.log('  - anasacknies@gmail.com / 123456 (paciente)')
  console.log('  - medico@teste.com / 123456 (médico)')
}

main()
  .catch(e => {
    console.error('Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
