import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Criar usuário administrador
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
      name: 'Dr. João Silva',
      role: 'DOCTOR',
      speciality: 'Cardiologia',
      crmNumber: 'CRM-SP 123456',
      phone: '(11) 99999-9999',
    },
  })

  // Criar alguns pacientes de exemplo
  const patients = [
    {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      cpf: '123.456.789-00',
      birthDate: new Date('1979-03-15'),
      gender: 'FEMALE',
      phone: '(11) 98765-4321',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      bloodType: 'A_POSITIVE',
      allergies: ['Penicilina'],
      chronicDiseases: ['Hipertensão'],
      doctorId: adminUser.id,
    },
    {
      name: 'João Silva',
      email: 'joao.silva@email.com',
      cpf: '987.654.321-00',
      birthDate: new Date('1962-07-22'),
      gender: 'MALE',
      phone: '(11) 91234-5678',
      address: 'Av. Paulista, 456',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '04567-890',
      bloodType: 'O_NEGATIVE',
      allergies: [],
      chronicDiseases: ['Diabetes Tipo 2'],
      doctorId: adminUser.id,
    },
    {
      name: 'Ana Costa',
      email: 'ana.costa@email.com',
      cpf: '456.789.123-00',
      birthDate: new Date('1990-12-10'),
      gender: 'FEMALE',
      phone: '(11) 95555-1234',
      address: 'Rua da Liberdade, 789',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '07890-123',
      bloodType: 'B_POSITIVE',
      allergies: ['Látex', 'Aspirina'],
      chronicDiseases: [],
      doctorId: adminUser.id,
    },
  ]

  const createdPatients = []
  for (const patientData of patients) {
    const patient = await prisma.patient.upsert({
      where: { cpf: patientData.cpf },
      update: {},
      create: patientData,
    })
    createdPatients.push(patient)
  }

  // Criar algumas consultas de exemplo
  const consultations = [
    {
      scheduledDate: new Date('2024-08-25T14:00:00'),
      type: 'ROUTINE',
      status: 'SCHEDULED',
      chiefComplaint: 'Dor no peito',
      patientId: createdPatients[0].id,
      doctorId: adminUser.id,
    },
    {
      scheduledDate: new Date('2024-08-24T10:30:00'),
      actualDate: new Date('2024-08-24T10:35:00'),
      type: 'FOLLOW_UP',
      status: 'COMPLETED',
      chiefComplaint: 'Retorno para acompanhamento',
      history: 'Paciente com diabetes em acompanhamento',
      physicalExam: 'Paciente em bom estado geral',
      assessment: 'Diabetes controlada',
      plan: 'Manter medicação atual',
      patientId: createdPatients[1].id,
      doctorId: adminUser.id,
    },
  ]

  for (const consultationData of consultations) {
    await prisma.consultation.upsert({
      where: { 
        patientId_scheduledDate: {
          patientId: consultationData.patientId,
          scheduledDate: consultationData.scheduledDate
        }
      },
      update: {},
      create: consultationData,
    })
  }

  // Criar alguns prontuários médicos
  const medicalRecords = [
    {
      title: 'Consulta Inicial - Cardiologia',
      description: 'Primeira consulta cardiológica para investigação de dor torácica',
      diagnosis: 'Dor torácica atípica',
      treatment: 'Medicação para ansiedade e acompanhamento',
      notes: 'Paciente refere episódios de dor no peito relacionados ao estresse',
      recordType: 'CONSULTATION',
      severity: 'LOW',
      patientId: createdPatients[0].id,
      doctorId: adminUser.id,
    },
    {
      title: 'Acompanhamento Diabetes',
      description: 'Consulta de retorno para diabetes tipo 2',
      diagnosis: 'Diabetes Mellitus Tipo 2',
      treatment: 'Metformina 850mg 2x/dia',
      notes: 'Glicemia controlada, paciente aderente ao tratamento',
      recordType: 'FOLLOW_UP',
      severity: 'MEDIUM',
      patientId: createdPatients[1].id,
      doctorId: adminUser.id,
    },
  ]

  for (const recordData of medicalRecords) {
    await prisma.medicalRecord.create({
      data: recordData,
    })
  }

  // Criar algumas prescrições
  const prescriptions = [
    {
      medication: 'Metformina',
      dosage: '850mg',
      frequency: '2 vezes ao dia',
      duration: '30 dias',
      instructions: 'Tomar durante as refeições',
      patientId: createdPatients[1].id,
      doctorId: adminUser.id,
    },
    {
      medication: 'Rivotril',
      dosage: '0,5mg',
      frequency: '1 vez ao dia',
      duration: '15 dias',
      instructions: 'Tomar antes de dormir',
      patientId: createdPatients[0].id,
      doctorId: adminUser.id,
    },
  ]

  for (const prescriptionData of prescriptions) {
    await prisma.prescription.create({
      data: prescriptionData,
    })
  }

  console.log('Seed concluído com sucesso!')
  console.log(`Usuário admin criado: ${adminUser.email}`)
  console.log(`${createdPatients.length} pacientes criados`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
