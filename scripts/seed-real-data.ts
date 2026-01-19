import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Criando dados reais para o sistema...')

  // 1. Criar usuários médicos
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
      password: await bcrypt.hash('123456', 10),
      name: 'Dr. Administrator',
      role: 'ADMIN',
      speciality: 'Administração Médica',
      crmNumber: 'CRM-SP-000001',
      phone: '+55 11 99999-9999',
      isActive: true
    }
  })

  const doctor1 = await prisma.user.upsert({
    where: { email: 'maria.cardiologia@hospital.com' },
    update: {},
    create: {
      email: 'maria.cardiologia@hospital.com',
      password: await bcrypt.hash('123456', 10),
      name: 'Dra. Maria Fernanda Silva',
      role: 'DOCTOR',
      speciality: 'Cardiologia',
      crmNumber: 'CRM-SP-123456',
      phone: '+55 11 98765-4321',
      isActive: true
    }
  })

  const doctor2 = await prisma.user.upsert({
    where: { email: 'joao.ortopedia@hospital.com' },
    update: {},
    create: {
      email: 'joao.ortopedia@hospital.com',
      password: await bcrypt.hash('123456', 10),
      name: 'Dr. João Carlos Santos',
      role: 'DOCTOR',
      speciality: 'Ortopedia',
      crmNumber: 'CRM-SP-654321',
      phone: '+55 11 97654-3210',
      isActive: true
    }
  })

  // 2. Criar pacientes reais
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { email: 'ana.silva@gmail.com' },
      update: {},
      create: {
        name: 'Ana Paula Silva',
        email: 'ana.silva@gmail.com',
        phone: '+55 11 91234-5678',
        cpf: '123.456.789-01',
        birthDate: new Date('1985-03-15'),
        gender: 'FEMALE',
        emergencyContact: 'Carlos Silva - Esposo - (11) 98765-4321',
        address: 'Rua das Flores, 123 - São Paulo/SP - CEP: 01234-567',
        medicalHistory: 'Hipertensão arterial controlada com medicação. Histórico familiar de diabetes.',
        allergies: 'Alergia a penicilina e frutos do mar.',
        currentMedications: 'Losartana 50mg (1x ao dia), Sinvastatina 20mg (1x ao dia)',
        riskLevel: 'MEDIO',
        insuranceNumber: 'UNIMED-SP-789123456'
      }
    }),
    
    prisma.patient.upsert({
      where: { email: 'carlos.santos@outlook.com' },
      update: {},
      create: {
        name: 'Carlos Eduardo Santos',
        email: 'carlos.santos@outlook.com',
        phone: '+55 11 92345-6789',
        cpf: '987.654.321-09',
        birthDate: new Date('1978-11-22'),
        gender: 'MALE',
        emergencyContact: 'Maria Santos - Esposa - (11) 93456-7890',
        address: 'Av. Paulista, 456 - São Paulo/SP - CEP: 01310-100',
        medicalHistory: 'Diabetes tipo 2 diagnosticado há 5 anos. Controle glicêmico regular.',
        allergies: 'Sem alergias conhecidas.',
        currentMedications: 'Metformina 850mg (2x ao dia), Glicazida 30mg (1x ao dia)',
        riskLevel: 'ALTO',
        insuranceNumber: 'BRADESCO-SAUDE-456789123'
      }
    }),
    
    prisma.patient.upsert({
      where: { email: 'mariana.oliveira@yahoo.com' },
      update: {},
      create: {
        name: 'Mariana Oliveira Costa',
        email: 'mariana.oliveira@yahoo.com',
        phone: '+55 11 93456-7890',
        cpf: '456.789.123-45',
        birthDate: new Date('1992-07-08'),
        gender: 'FEMALE',
        emergencyContact: 'Roberto Costa - Pai - (11) 94567-8901',
        address: 'Rua Augusta, 789 - São Paulo/SP - CEP: 01305-000',
        medicalHistory: 'Saudável. Consultas preventivas regulares.',
        allergies: 'Alergia a ácaros e pólen.',
        currentMedications: 'Anticoncepcional oral (uso contínuo)',
        riskLevel: 'BAIXO',
        insuranceNumber: 'AMIL-SP-321654987'
      }
    }),
    
    prisma.patient.upsert({
      where: { email: 'jose.ferreira@hotmail.com' },
      update: {},
      create: {
        name: 'José Ferreira Lima',
        email: 'jose.ferreira@hotmail.com',
        phone: '+55 11 94567-8901',
        cpf: '789.123.456-78',
        birthDate: new Date('1965-12-03'),
        gender: 'MALE',
        emergencyContact: 'Ana Ferreira - Filha - (11) 95678-9012',
        address: 'Rua da Consolação, 321 - São Paulo/SP - CEP: 01301-000',
        medicalHistory: 'Hipertensão arterial, colesterol alto, artrite reumatoide.',
        allergies: 'Alergia a dipirona e AAS.',
        currentMedications: 'Enalapril 10mg (2x ao dia), Atorvastatina 40mg (1x ao dia), Metotrexato 15mg (1x semana)',
        riskLevel: 'ALTO',
        insuranceNumber: 'SUL-AMERICA-147258369'
      }
    }),
    
    prisma.patient.upsert({
      where: { email: 'lucia.martins@gmail.com' },
      update: {},
      create: {
        name: 'Lúcia Martins Pereira',
        email: 'lucia.martins@gmail.com',
        phone: '+55 11 95678-9012',
        cpf: '321.654.987-12',
        birthDate: new Date('1990-05-18'),
        gender: 'FEMALE',
        emergencyContact: 'Pedro Martins - Irmão - (11) 96789-0123',
        address: 'Alameda Santos, 654 - São Paulo/SP - CEP: 01419-000',
        medicalHistory: 'Ansiedade generalizada em tratamento. Enxaqueca crônica.',
        allergies: 'Sem alergias conhecidas.',
        currentMedications: 'Sertralina 50mg (1x ao dia), Topiramato 25mg (2x ao dia)',
        riskLevel: 'MEDIO',
        insuranceNumber: 'GOLDEN-CROSS-963852741'
      }
    })
  ])

  console.log(`✅ Criados ${patients.length} pacientes`)

  // 3. Criar consultas reais
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const consultations = await Promise.all([
    // Consulta hoje
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(today.setHours(14, 30, 0, 0)),
        duration: 30,
        type: 'ROUTINE',
        status: 'SCHEDULED',
        notes: 'Consulta de rotina para controle da hipertensão',
        patientId: patients[0].id,
        doctorId: doctor1.id
      }
    }),

    // Consulta hoje - tarde
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(today.setHours(16, 0, 0, 0)),
        duration: 45,
        type: 'ROUTINE',
        status: 'SCHEDULED', 
        notes: 'Consulta para ajuste de medicação diabetes',
        patientId: patients[1].id,
        doctorId: doctor1.id
      }
    }),

    // Consulta amanhã
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(tomorrow.setHours(10, 0, 0, 0)),
        duration: 60,
        type: 'FOLLOW_UP',
        status: 'SCHEDULED',
        notes: 'Retorno para avaliação de resultados de exames',
        patientId: patients[3].id,
        doctorId: doctor2.id
      }
    }),

    // Consulta próxima semana
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(nextWeek.setHours(9, 30, 0, 0)),
        duration: 30,
        type: 'ROUTINE',
        status: 'SCHEDULED',
        notes: 'Consulta preventiva anual',
        patientId: patients[2].id,
        doctorId: doctor1.id
      }
    }),

    // Consulta concluída (ontem)
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        actualDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        duration: 45,
        type: 'ROUTINE',
        status: 'COMPLETED',
        notes: 'Consulta de acompanhamento ansiedade - paciente estável',
        patientId: patients[4].id,
        doctorId: doctor1.id
      }
    })
  ])

  console.log(`✅ Criadas ${consultations.length} consultas`)

  // 4. Criar prontuários médicos
  const medicalRecords = await Promise.all([
    prisma.medicalRecord.create({
      data: {
        title: 'Consulta Cardiológica - Controle Hipertensão',
        description: 'Paciente apresenta-se para consulta de rotina. Pressão arterial controlada (130/80 mmHg). Mantém uso regular da medicação.',
        diagnosis: 'Hipertensão arterial sistêmica controlada',
        treatment: 'Manutenção do esquema terapêutico atual. Orientações dietéticas reforçadas.',
        notes: 'Paciente aderente ao tratamento. Próxima consulta em 3 meses.',
        recordType: 'CONSULTATION',
        severity: 'LOW',
        patientId: patients[0].id,
        doctorId: doctor1.id
      }
    }),

    prisma.medicalRecord.create({
      data: {
        title: 'Consulta Endocrinológica - Diabetes Tipo 2',
        description: 'Controle glicêmico adequado. HbA1c: 7.2%. Sem sinais de complicações diabéticas.',
        diagnosis: 'Diabetes mellitus tipo 2 com bom controle metabólico',
        treatment: 'Ajuste da dose de Metformina. Manutenção da Glicazida.',
        notes: 'Orientações nutricionais reforçadas. Incentivo à atividade física regular.',
        recordType: 'CONSULTATION',
        severity: 'MEDIUM',
        patientId: patients[1].id,
        doctorId: doctor1.id
      }
    }),

    prisma.medicalRecord.create({
      data: {
        title: 'Consulta Psiquiátrica - Ansiedade Generalizada',
        description: 'Paciente relata melhora significativa dos sintomas ansiosos. Sem efeitos colaterais da medicação.',
        diagnosis: 'Transtorno de ansiedade generalizada em remissão parcial',
        treatment: 'Manutenção da Sertralina. Continuidade da psicoterapia.',
        notes: 'Paciente estável. Retorno em 2 meses para reavaliação.',
        recordType: 'CONSULTATION',
        severity: 'LOW',
        patientId: patients[4].id,
        doctorId: doctor1.id
      }
    })
  ])

  console.log(`✅ Criados ${medicalRecords.length} prontuários médicos`)

  // 4. Criar prescrições reais
  const prescriptions = await Promise.all([
    prisma.prescription.create({
      data: {
        medication: 'Losartana Potássica',
        dosage: '50mg',
        frequency: '1 vez ao dia',
        duration: '30 dias',
        instructions: 'Tomar pela manhã, com o estômago vazio',
        status: 'ACTIVE',
        startDate: new Date(),
        patientId: patients[0].id,
        doctorId: doctor1.id
      }
    }),

    prisma.prescription.create({
      data: {
        medication: 'Metformina',
        dosage: '850mg',
        frequency: '2 vezes ao dia',
        duration: '60 dias',
        instructions: 'Tomar durante as refeições principais',
        status: 'ACTIVE',
        startDate: new Date(),
        patientId: patients[1].id,
        doctorId: doctor1.id
      }
    }),

    prisma.prescription.create({
      data: {
        medication: 'Sertralina',
        dosage: '50mg',
        frequency: '1 vez ao dia',
        duration: '90 dias',
        instructions: 'Tomar pela manhã, preferencialmente no mesmo horário',
        status: 'ACTIVE',
        startDate: new Date(),
        patientId: patients[4].id,
        doctorId: doctor1.id
      }
    }),

    prisma.prescription.create({
      data: {
        medication: 'Omeprazol',
        dosage: '20mg',
        frequency: '1 vez ao dia',
        duration: '30 dias',
        instructions: 'Tomar em jejum, 30 minutos antes do café da manhã',
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        patientId: patients[3].id,
        doctorId: doctor2.id
      }
    })
  ])

  console.log(`✅ Criadas ${prescriptions.length} prescrições`)

  // 5. Criar solicitações de exames
  const examRequests = await Promise.all([
    prisma.examRequest.create({
      data: {
        examType: 'Hemograma Completo',
        description: 'Exame de sangue para avaliação geral',
        urgency: 'ROUTINE',
        status: 'SCHEDULED',
        requestDate: new Date(),
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Jejum de 12 horas',
        patientId: patients[0].id,
        doctorId: doctor1.id
      }
    }),

    prisma.examRequest.create({
      data: {
        examType: 'Glicemia de Jejum',
        description: 'Controle glicêmico para diabetes',
        urgency: 'ROUTINE',
        status: 'COMPLETED',
        requestDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        results: 'Glicemia: 95 mg/dL - Resultado normal',
        notes: 'Controle adequado do diabetes',
        patientId: patients[1].id,
        doctorId: doctor1.id
      }
    }),

    prisma.examRequest.create({
      data: {
        examType: 'Raio-X Coluna Lombar',
        description: 'Investigação de dor nas costas',
        urgency: 'URGENT',
        status: 'IN_PROGRESS',
        requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        scheduledDate: new Date(),
        notes: 'Dor intensa há 3 semanas',
        patientId: patients[3].id,
        doctorId: doctor2.id
      }
    }),

    prisma.examRequest.create({
      data: {
        examType: 'Ecocardiograma',
        description: 'Avaliação função cardíaca',
        urgency: 'EMERGENCY',
        status: 'REQUESTED',
        requestDate: new Date(),
        notes: 'Paciente com palpitações e dispneia',
        patientId: patients[2].id,
        doctorId: doctor1.id
      }
    })
  ])

  console.log(`✅ Criadas ${examRequests.length} solicitações de exames`)

  console.log('🎉 Dados reais criados com sucesso!')
  console.log('\n📊 Resumo:')
  console.log(`👥 Usuários: 3 (1 admin, 2 médicos)`)
  console.log(`🏥 Pacientes: ${patients.length}`)
  console.log(`📅 Consultas: ${consultations.length}`)
  console.log(`📋 Prontuários: ${medicalRecords.length}`)
  console.log(`💊 Prescrições: ${prescriptions.length}`)
  console.log(`🔬 Exames: ${examRequests.length}`)
  console.log('\n🔐 Login de teste:')
  console.log('Email: admin@healthcare.com')
  console.log('Senha: 123456')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar dados:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
