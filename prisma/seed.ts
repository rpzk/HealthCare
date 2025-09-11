import { PrismaClient, Gender, ConsultationType, ConsultationStatus, RecordType, Severity, Role } from '@prisma/client'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Encrypt helper (replica mínima de lib/crypto.ts)
const ENC_ALG = 'aes-256-gcm'
const KEY = (process.env.ENCRYPTION_KEY || '').padEnd(32, '0').slice(0,32)
function encrypt(value?: string | null): string | null {
  if (!value) return null
  try {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ENC_ALG, Buffer.from(KEY), iv)
    const enc = Buffer.concat([cipher.update(value,'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return 'enc::' + Buffer.concat([iv, tag, enc]).toString('base64')
  } catch {
    return null
  }
}

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Criar usuário administrador
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
  name: 'Dr. Admin Sistema',
  role: Role.ADMIN,
  speciality: 'Administração',
  crmNumber: 'CRM-ADM-001',
  phone: '(11) 99999-9999',
  password: await bcrypt.hash('admin123', 12)
    },
  })

  // Criar alguns pacientes de exemplo
  const patients = [
    {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      cpf: '123.456.789-00',
      birthDate: new Date('1979-03-15'),
      gender: Gender.FEMALE,
      phone: '(11) 98765-4321',
  address: 'Rua das Flores, 123',
    },
    {
      name: 'João Silva',
      email: 'joao.silva@email.com',
      cpf: '987.654.321-00',
      birthDate: new Date('1962-07-22'),
      gender: Gender.MALE,
      phone: '(11) 91234-5678',
  address: 'Av. Paulista, 456',
    },
    {
      name: 'Ana Costa',
      email: 'ana.costa@email.com',
      cpf: '456.789.123-00',
      birthDate: new Date('1990-12-10'),
      gender: Gender.FEMALE,
      phone: '(11) 95555-1234',
  address: 'Rua da Liberdade, 789',
    },
  ]

  const createdPatients = []
  for (const patientData of patients) {
    const cleanCpf = patientData.cpf.replace(/\D/g,'')
    const patient = await prisma.patient.upsert({
      where: { email: patientData.email },
      update: {},
      create: { ...patientData, cpf: encrypt(cleanCpf) }
    })
    createdPatients.push(patient)
  }

  // Criar algumas consultas de exemplo
  const consultations = [
    {
      scheduledDate: new Date('2024-08-25T14:00:00'),
      type: ConsultationType.ROUTINE,
      status: ConsultationStatus.SCHEDULED,
      chiefComplaint: 'Dor no peito',
  patientId: createdPatients[0].id,
  doctorId: adminUser.id,
    },
    {
      scheduledDate: new Date('2024-08-24T10:30:00'),
      actualDate: new Date('2024-08-24T10:35:00'),
      type: ConsultationType.FOLLOW_UP,
      status: ConsultationStatus.COMPLETED,
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
    await prisma.consultation.create({
      data: consultationData,
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
      recordType: RecordType.CONSULTATION,
      severity: Severity.LOW,
      patientId: createdPatients[0].id,
      doctorId: adminUser.id,
    },
    {
      title: 'Acompanhamento Diabetes',
      description: 'Consulta de retorno para diabetes tipo 2',
      diagnosis: 'Diabetes Mellitus Tipo 2',
      treatment: 'Metformina 850mg 2x/dia',
      notes: 'Glicemia controlada, paciente aderente ao tratamento',
      recordType: RecordType.FOLLOW_UP,
      severity: Severity.MEDIUM,
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
