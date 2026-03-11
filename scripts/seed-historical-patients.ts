#!/usr/bin/env tsx
import 'dotenv/config'

/**
 * Seed de Pacientes Históricos - Figuras públicas com condições médicas conhecidas
 *
 * Cria ~10 pacientes com dados fictícios baseados em personalidades reais
 * (falecidas, domínio público), incluindo:
 * - Histórico médico conhecido
 * - 2-4 consultas por paciente
 * - Diagnósticos CID-10
 * - Sinais vitais exemplares
 * - Prescrições quando aplicável
 *
 * Uso: npm run db:seed:historical
 *
 * Pré-requisitos:
 * - DATABASE_URL configurado
 * - Seed base (db:seed) já executado (médico doctor@healthcare.com)
 */

import { PrismaClient, Gender, ConsultationType, ConsultationStatus, RiskLevel } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { addDays, subDays, subYears, setHours, setMinutes, startOfDay } from 'date-fns'
import { addToCareTeam } from '@/lib/patient-access'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Helper: obter ou criar CodeSystem CID10 e MedicalCode
async function ensureMedicalCode(
  code: string,
  display: string
): Promise<string> {
  let system = await prisma.codeSystem.findFirst({
    where: { kind: 'CID10', version: null },
  })
  if (!system) {
    system = await prisma.codeSystem.create({
      data: {
        kind: 'CID10',
        name: 'CID-10',
        version: null,
        description: 'Classificação Internacional de Doenças, 10ª revisão',
      },
    })
  }

  const existing = await prisma.medicalCode.findFirst({
    where: { systemId: system.id, code },
  })
  if (existing) return existing.id

  const created = await prisma.medicalCode.create({
    data: {
      systemId: system.id,
      code,
      display,
      description: display,
      active: true,
    },
  })
  return created.id
}

/** Slots de 30min: manhã 8h-12h, tarde 14h-18h */
const SLOTS = [
  [8, 0], [8, 30], [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
  [14, 0], [14, 30], [15, 0], [15, 30], [16, 0], [16, 30], [17, 0], [17, 30],
]

function slotToDate(day: Date, slotIndex: number): Date {
  const [h, m] = SLOTS[slotIndex % SLOTS.length]
  return setMinutes(setHours(new Date(day), h), m)
}

type HistoricalPatient = {
  name: string
  birthDate: Date
  gender: Gender
  email: string
  cpf: string
  phone: string
  address: string
  medicalHistory: string
  riskLevel: RiskLevel
  conditions: { code: string; display: string }[]
  vitalSigns: {
    systolicBP?: number
    diastolicBP?: number
    heartRate?: number
    respiratoryRate?: number
    temperature?: number
    weight?: number
    height?: number
    oxygenSaturation?: number
    bloodGlucose?: number
  }
  prescriptions?: { medication: string; dosage: string; frequency: string; duration: string }[]
}

const HISTORICAL_PATIENTS: HistoricalPatient[] = [
  {
    name: 'Stephen Hawking',
    birthDate: new Date('1942-01-08'),
    gender: Gender.MALE,
    email: 'patient.hawking@teste.healthcare.com',
    cpf: '12345678901',
    phone: '(11) 91111-1111',
    address: 'Rua Cambridge, 21, Cambridge, UK',
    medicalHistory:
      'Esclerose Lateral Amiotrófica (ELA) diagnosticada em 1963. Histórico de pneumonia recorrente. Uso de ventilação não invasiva.',
    riskLevel: RiskLevel.ALTO,
    conditions: [
      { code: 'G12.2', display: 'Esclerose lateral amiotrófica' },
      { code: 'J18', display: 'Pneumonia' },
    ],
    vitalSigns: { heartRate: 72, respiratoryRate: 18, oxygenSaturation: 95 },
    prescriptions: [
      { medication: 'Riluzol', dosage: '50mg', frequency: '12/12h', duration: 'Uso contínuo' },
    ],
  },
  {
    name: 'Albert Einstein',
    birthDate: new Date('1879-03-14'),
    gender: Gender.MALE,
    email: 'patient.einstein@teste.healthcare.com',
    cpf: '23456789012',
    phone: '(11) 92222-2222',
    address: 'Rua Princeton, 112, Princeton, NJ',
    medicalHistory: 'Aneurisma de aorta abdominal. Evolução para ruptura em 1955.',
    riskLevel: RiskLevel.CRITICO,
    conditions: [
      { code: 'I71.4', display: 'Aneurisma da aorta abdominal sem menção de ruptura' },
    ],
    vitalSigns: { systolicBP: 160, diastolicBP: 95, heartRate: 78 },
  },
  {
    name: 'Charles Darwin',
    birthDate: new Date('1809-02-12'),
    gender: Gender.MALE,
    email: 'patient.darwin@teste.healthcare.com',
    cpf: '34567890123',
    phone: '(11) 93333-3333',
    address: 'Rua Down House, 1, Kent, UK',
    medicalHistory:
      'Suspeita de doença de Chagas (viagem ao Chile). Cardiopatia. Náuseas e dispneia aos esforços.',
    riskLevel: RiskLevel.MEDIO,
    conditions: [
      { code: 'B57', display: 'Doença de Chagas' },
      { code: 'I50', display: 'Insuficiência cardíaca' },
    ],
    vitalSigns: { systolicBP: 130, diastolicBP: 85, heartRate: 82 },
  },
  {
    name: 'Napoleão Bonaparte',
    birthDate: new Date('1769-08-15'),
    gender: Gender.MALE,
    email: 'patient.napoleao@teste.healthcare.com',
    cpf: '45678901234',
    phone: '(11) 94444-4444',
    address: 'Ilha de Santa Helena',
    medicalHistory: 'Epigastralgia crônica, emagrecimento. Suspeita de neoplasia gástrica.',
    riskLevel: RiskLevel.ALTO,
    conditions: [
      { code: 'C16', display: 'Neoplasia maligna do estômago' },
    ],
    vitalSigns: { weight: 65, systolicBP: 120, diastolicBP: 80, heartRate: 70 },
  },
  {
    name: 'Freddie Mercury',
    birthDate: new Date('1946-09-05'),
    gender: Gender.MALE,
    email: 'patient.mercury@teste.healthcare.com',
    cpf: '56789012345',
    phone: '(11) 95555-5555',
    address: 'Rua Garden Lodge, Londres, UK',
    medicalHistory: 'HIV/AIDS. Pneumonia por Pneumocystis. Tuberculose pulmonar.',
    riskLevel: RiskLevel.CRITICO,
    conditions: [
      { code: 'B20', display: 'Doença pelo vírus da imunodeficiência humana [HIV]' },
      { code: 'J18', display: 'Pneumonia' },
    ],
    vitalSigns: { respiratoryRate: 24, oxygenSaturation: 88, temperature: 38.2 },
  },
  {
    name: 'Princess Diana',
    birthDate: new Date('1961-07-01'),
    gender: Gender.FEMALE,
    email: 'patient.diana@teste.healthcare.com',
    cpf: '67890123456',
    phone: '(11) 96666-6666',
    address: 'Kensington Palace, Londres, UK',
    medicalHistory: 'Depressão pós-parto. Transtorno alimentar (bulimia). Ansiedade.',
    riskLevel: RiskLevel.MEDIO,
    conditions: [
      { code: 'F32', display: 'Episódios depressivos' },
      { code: 'F50.2', display: 'Bulimia nervosa' },
    ],
    vitalSigns: { weight: 55, height: 178, systolicBP: 110, diastolicBP: 70 },
  },
  {
    name: 'Oscar Wilde',
    birthDate: new Date('1854-10-16'),
    gender: Gender.MALE,
    email: 'patient.wilde@teste.healthcare.com',
    cpf: '78901234567',
    phone: '(11) 97777-7777',
    address: 'Hôtel d\'Alsace, Paris, França',
    medicalHistory: 'Meningite bacteriana. Evolução fulminante.',
    riskLevel: RiskLevel.CRITICO,
    conditions: [{ code: 'G00', display: 'Meningite bacteriana' }],
    vitalSigns: { temperature: 40, heartRate: 110, systolicBP: 90 },
  },
  {
    name: 'Vincent van Gogh',
    birthDate: new Date('1853-03-30'),
    gender: Gender.MALE,
    email: 'patient.vangogh@teste.healthcare.com',
    cpf: '89012345678',
    phone: '(11) 98888-8888',
    address: 'Auvers-sur-Oise, França',
    medicalHistory: 'Transtorno bipolar. Episódios depressivos. Automutilação.',
    riskLevel: RiskLevel.ALTO,
    conditions: [
      { code: 'F31', display: 'Transtornos afetivos bipolares' },
      { code: 'F32', display: 'Episódios depressivos' },
    ],
    vitalSigns: { systolicBP: 125, diastolicBP: 80, heartRate: 75 },
    prescriptions: [
      { medication: 'Carbonato de lítio', dosage: '300mg', frequency: '8/8h', duration: 'Uso contínuo' },
    ],
  },
  {
    name: 'Frida Kahlo',
    birthDate: new Date('1907-07-06'),
    gender: Gender.FEMALE,
    email: 'patient.frida@teste.healthcare.com',
    cpf: '90123456789',
    phone: '(11) 99999-9999',
    address: 'Casa Azul, Coyoacán, México',
    medicalHistory: 'Poliomielite na infância. Acidente de ônibus (1925). Dor crônica. Múltiplas cirurgias de coluna.',
    riskLevel: RiskLevel.MEDIO,
    conditions: [
      { code: 'G82', display: 'Paralisia cerebral e síndromes paralíticas' },
      { code: 'M25.5', display: 'Dor articular' },
    ],
    vitalSigns: { weight: 52, height: 155, systolicBP: 118, diastolicBP: 72 },
    prescriptions: [
      { medication: 'Diclofenaco', dosage: '50mg', frequency: '8/8h', duration: 'Sob demanda' },
    ],
  },
  {
    name: 'Clarice Lispector',
    birthDate: new Date('1920-12-10'),
    gender: Gender.FEMALE,
    email: 'patient.clarice@teste.healthcare.com',
    cpf: '01234567890',
    phone: '(11) 90000-0000',
    address: 'Rua Leme, 195, Rio de Janeiro, RJ',
    medicalHistory: 'Neoplasia maligna de ovário. Diagnóstico tardio.',
    riskLevel: RiskLevel.CRITICO,
    conditions: [{ code: 'C56', display: 'Neoplasia maligna do ovário' }],
    vitalSigns: { weight: 48, systolicBP: 100, diastolicBP: 65, heartRate: 85 },
  },
]

async function main() {
  console.log('🌱 Seed de Pacientes Históricos - Iniciando...\n')

  const doctor = await prisma.user.findFirst({
    where: { email: 'doctor@healthcare.com', role: 'DOCTOR' },
  })
  if (!doctor) {
    throw new Error(
      'Médico doctor@healthcare.com não encontrado. Execute primeiro: npm run db:seed'
    )
  }

  const today = new Date()
  let patientsCreated = 0
  let consultationsCreated = 0
  let diagnosesCreated = 0
  let vitalSignsCreated = 0
  let prescriptionsCreated = 0

  for (let patientIndex = 0; patientIndex < HISTORICAL_PATIENTS.length; patientIndex++) {
    const hp = HISTORICAL_PATIENTS[patientIndex]
    let patient = await prisma.patient.findUnique({
      where: { email: hp.email },
    })
    if (patient) {
      console.log(`⏭️  Paciente já existe: ${hp.name} (${hp.email}) - garantindo vínculo RBAC e consultas futuras`)
      await addToCareTeam(patient.id, doctor.id, doctor.id, {
        accessLevel: 'FULL',
        isPrimary: true,
        reason: 'Seed pacientes históricos - médico responsável',
      })
      // Substituir consultas futuras por distribuição realista (evitar sobreposição)
      await prisma.consultation.deleteMany({
        where: {
          patientId: patient!.id,
          doctorId: doctor.id,
          scheduledDate: { gte: today },
          status: 'SCHEDULED',
        },
      })
      const day1 = addDays(today, 1)
      const day4 = addDays(today, 4)
      const slot1 = patientIndex % SLOTS.length
      const slot2 = (patientIndex + 5) % SLOTS.length
      for (const scheduledDate of [
        slotToDate(day1, slot1),
        slotToDate(day4, slot2),
      ]) {
        await prisma.consultation.create({
          data: {
            patientId: patient!.id,
            doctorId: doctor.id,
            scheduledDate,
            type: ConsultationType.FOLLOW_UP,
            status: ConsultationStatus.SCHEDULED,
            chiefComplaint: 'Retorno agendado',
          },
        })
        consultationsCreated += 2
      }
      continue
    }

    patient = await prisma.patient.create({
      data: {
        name: hp.name,
        email: hp.email,
        cpf: hp.cpf,
        birthDate: hp.birthDate,
        gender: hp.gender,
        phone: hp.phone,
        address: hp.address,
        medicalHistory: hp.medicalHistory,
        riskLevel: hp.riskLevel,
      },
    })
    patientsCreated++

    // Vincula o médico à equipe de cuidado (RBAC: apenas doctor@healthcare.com vê estes pacientes)
    await addToCareTeam(patient.id, doctor.id, doctor.id, {
      accessLevel: 'FULL',
      isPrimary: true,
      reason: 'Seed pacientes históricos - médico responsável',
    })

    const numConsultations = 2 + Math.floor(Math.random() * 3)
    const consultationDates: Date[] = []
    for (let i = 0; i < numConsultations; i++) {
      consultationDates.push(subDays(today, 30 + i * 45))
    }
    consultationDates.sort((a, b) => a.getTime() - b.getTime())

    for (let i = 0; i < numConsultations; i++) {
      const scheduledDate = consultationDates[i]
      const completedAt = addDays(scheduledDate, 0)

      const consultation = await prisma.consultation.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledDate,
          actualDate: completedAt,
          completedAt,
          type: i === 0 ? ConsultationType.INITIAL : ConsultationType.FOLLOW_UP,
          status: ConsultationStatus.COMPLETED,
          chiefComplaint:
            i === 0
              ? hp.conditions.map((c) => c.display).join('; ')
              : 'Retorno para acompanhamento',
          history: hp.medicalHistory,
          physicalExam: 'Exame físico compatível com quadro descrito.',
          assessment: `Acompanhamento de ${hp.conditions[0].display}.`,
          plan: 'Manter tratamento. Retorno conforme evolução.',
        },
      })
      consultationsCreated++

      for (const cond of hp.conditions) {
        const primaryCodeId = await ensureMedicalCode(cond.code, cond.display)
        await prisma.diagnosis.create({
          data: {
            patientId: patient.id,
            consultationId: consultation.id,
            primaryCodeId,
            status: 'ACTIVE',
            certainty: 'CONFIRMED',
            notes: `Diagnóstico histórico conhecido: ${cond.display}`,
            onsetDate: subYears(today, 2),
          },
        })
        diagnosesCreated++
      }

      await prisma.vitalSigns.create({
        data: {
          patientId: patient.id,
          consultationId: consultation.id,
          ...hp.vitalSigns,
          recordedAt: completedAt,
        },
      })
      vitalSignsCreated++
    }

    // Consultas FUTURAS distribuídas em slots de 30min (dashboard "Próximas consultas")
    const day1 = addDays(today, 1)
    const day4 = addDays(today, 4)
    const slot1 = patientIndex % SLOTS.length
    const slot2 = (patientIndex + 5) % SLOTS.length
    const futureDates = [
      slotToDate(day1, slot1),
      slotToDate(day4, slot2),
    ]
    for (const scheduledDate of futureDates) {
      await prisma.consultation.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledDate,
          type: ConsultationType.FOLLOW_UP,
          status: ConsultationStatus.SCHEDULED,
          chiefComplaint: 'Retorno agendado',
        },
      })
      consultationsCreated++
    }

    if (hp.prescriptions && hp.prescriptions.length > 0 && consultationDates.length > 0) {
      const lastConsultation = await prisma.consultation.findFirst({
        where: { patientId: patient.id },
        orderBy: { scheduledDate: 'desc' },
      })
      if (lastConsultation) {
        for (const rx of hp.prescriptions) {
          await prisma.prescription.create({
            data: {
              patientId: patient.id,
              doctorId: doctor.id,
              consultationId: lastConsultation.id,
              medication: rx.medication,
              dosage: rx.dosage,
              frequency: rx.frequency,
              duration: rx.duration,
              status: 'ACTIVE',
            },
          })
          prescriptionsCreated++
        }
      }
    }

    console.log(`✅ ${hp.name}: paciente + ${numConsultations} consultas + diagnósticos + sinais vitais`)
  }

  // Seed: horários de atendimento (com almoço 12h-14h) e exceções
  let schedulesCreated = 0
  let exceptionsCreated = 0
  await prisma.professionalSchedule.deleteMany({
    where: { professionalId: doctor.id },
  })
  const weekdays = [1, 2, 3, 4, 5]
  const slotsPerDay = [
    { start: '08:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ]
  for (const dayOfWeek of weekdays) {
    for (const slot of slotsPerDay) {
      await prisma.professionalSchedule.create({
        data: {
          professionalId: doctor.id,
          dayOfWeek,
          startTime: slot.start,
          endTime: slot.end,
          status: 'APPROVED',
          requestedBy: doctor.id,
          approvedBy: doctor.id,
          approvedAt: new Date(),
        },
      })
      schedulesCreated++
    }
  }
  if (schedulesCreated > 0) console.log(`   Horários de atendimento: Seg-Sex 8h-12h e 14h-18h (almoço)`)

  // Exceções: férias (1 semana), dia de bloqueio, reunião
  const nextMonth = addDays(today, 15)
  const vacationStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10)
  const vacationEnd = addDays(vacationStart, 6)
  for (let d = new Date(vacationStart); d <= vacationEnd; d = addDays(d, 1)) {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const exists = await prisma.scheduleException.findFirst({
      where: { doctorId: doctor.id, date: dayStart },
    })
    if (!exists) {
      await prisma.scheduleException.create({
        data: {
          doctorId: doctor.id,
          date: dayStart,
          blockType: 'VACATION',
          reason: 'Férias programadas (seed teste)',
        },
      })
      exceptionsCreated++
    }
  }
  const blockDay = addDays(today, 7)
  const blockDate = new Date(blockDay.getFullYear(), blockDay.getMonth(), blockDay.getDate())
  const blockExists = await prisma.scheduleException.findFirst({
    where: { doctorId: doctor.id, date: blockDate },
  })
  if (!blockExists) {
    await prisma.scheduleException.create({
      data: {
        doctorId: doctor.id,
        date: blockDate,
        blockType: 'UNAVAILABLE',
        reason: 'Indisponível (seed teste)',
      },
    })
    exceptionsCreated++
  }
  const meetingDay = addDays(today, 3)
  const meetingDate = new Date(meetingDay.getFullYear(), meetingDay.getMonth(), meetingDay.getDate())
  const meetingExists = await prisma.scheduleException.findFirst({
    where: { doctorId: doctor.id, date: meetingDate },
  })
  if (!meetingExists) {
    await prisma.scheduleException.create({
      data: {
        doctorId: doctor.id,
        date: meetingDate,
        blockType: 'MEETING',
        reason: 'Reunião/Conferência (seed teste)',
      },
    })
    exceptionsCreated++
  }
  if (exceptionsCreated > 0) console.log(`   Exceções de agenda: férias + bloqueio + reunião`)

  console.log('\n📊 Resumo:')
  console.log(`   Pacientes: ${patientsCreated}`)
  console.log(`   Consultas: ${consultationsCreated}`)
  console.log(`   Diagnósticos: ${diagnosesCreated}`)
  console.log(`   Sinais vitais: ${vitalSignsCreated}`)
  console.log(`   Prescrições: ${prescriptionsCreated}`)
  console.log('\n✨ Seed de pacientes históricos concluído.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
