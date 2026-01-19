import { prisma } from '../lib/prisma'
import { Gender, RiskLevel } from '@prisma/client'

// Lista de figuras históricas (dados adaptados, datas aproximadas ou padronizadas)
// Emails artificiais para evitar conflitos reais
const patients = [
  {
    name: 'Albert Einstein',
    email: 'albert.einstein@history.test',
    birthDate: new Date('1879-03-14'),
    gender: Gender.MALE,
    medicalHistory: 'Teórico da relatividade. Histórico de aneurisma da aorta abdominal (falecimento em 1955).',
    currentMedications: '—',
    allergies: 'Nenhuma conhecida',
    riskLevel: RiskLevel.MEDIO
  },
  {
    name: 'Marie Curie',
    email: 'marie.curie@history.test',
    birthDate: new Date('1867-11-07'),
    gender: Gender.FEMALE,
    medicalHistory: 'Pioneira em radioatividade. Exposição crônica à radiação; anemia aplástica.',
    currentMedications: '—',
    allergies: 'Nenhuma conhecida',
    riskLevel: RiskLevel.ALTO
  },
  {
    name: 'Leonardo da Vinci',
    email: 'leonardo.davinci@history.test',
    birthDate: new Date('1452-04-15'),
    gender: Gender.MALE,
    medicalHistory: 'Polímata renascentista. Possível lateralidade cruzada e notas sobre anatomia.',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.BAIXO
  },
  {
    name: 'Cleopatra VII',
    email: 'cleopatra.vii@history.test',
    birthDate: new Date('1969-01-01'), // Data simbólica (impossível precisa)
    gender: Gender.FEMALE,
    medicalHistory: 'Última rainha do Egito Ptolemaico. Registros médicos primários inexistentes.',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.BAIXO
  },
  {
    name: 'Mahatma Gandhi',
    email: 'mahatma.gandhi@history.test',
    birthDate: new Date('1869-10-02'),
    gender: Gender.MALE,
    medicalHistory: 'Líder pacifista. Vários jejuns prolongados; episódios de anemia e perda de peso.',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.MEDIO
  },
  {
    name: 'Florence Nightingale',
    email: 'florence.nightingale@history.test',
    birthDate: new Date('1820-05-12'),
    gender: Gender.FEMALE,
    medicalHistory: 'Fundadora da enfermagem moderna. Sofria de doenças crônicas (talvez brucelose).',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.MEDIO
  },
  {
    name: 'Nelson Mandela',
    email: 'nelson.mandela@history.test',
    birthDate: new Date('1918-07-18'),
    gender: Gender.MALE,
    medicalHistory: 'Líder sul-africano. Histórico de tuberculose durante encarceramento.',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.MEDIO
  },
  {
    name: 'Frida Kahlo',
    email: 'frida.kahlo@history.test',
    birthDate: new Date('1907-07-06'),
    gender: Gender.FEMALE,
    medicalHistory: 'Artista mexicana. Sequelas de poliomielite e múltiplas cirurgias após acidente.',
    currentMedications: 'Analgésicos ocasionais (histórico).',
    allergies: '—',
    riskLevel: RiskLevel.ALTO
  },
  {
    name: 'Martin Luther King Jr.',
    email: 'martin.luther.king@history.test',
    birthDate: new Date('1929-01-15'),
    gender: Gender.MALE,
    medicalHistory: 'Líder dos direitos civis. Estresse crônico associado à militância.',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.MEDIO
  },
  {
    name: 'Ada Lovelace',
    email: 'ada.lovelace@history.test',
    birthDate: new Date('1815-12-10'),
    gender: Gender.FEMALE,
    medicalHistory: 'Pioneira da computação. Faleceu de câncer uterino (histórico).',
    currentMedications: '—',
    allergies: '—',
    riskLevel: RiskLevel.ALTO
  }
]

async function main() {
  console.log('> Inserindo pacientes históricos...')
  for (const p of patients) {
    const existing = await prisma.patient.findUnique({ where: { email: p.email } })
    if (existing) {
      console.log(`  - Já existe: ${p.name}`)
      continue
    }
    const created = await prisma.patient.create({ data: p })
    console.log(`  + Criado: ${created.name}`)
  }
  console.log('> Concluído.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
