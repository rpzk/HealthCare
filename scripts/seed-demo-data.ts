import { PrismaClient, ConsultationType, ConsultationStatus, RecordType, Severity, PrescriptionStatus, Urgency, ExamStatus, Gender, RiskLevel } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

/*
  Este seed gera dados de demonstração adicionais:
  - Seleciona até 10 pacientes existentes
  - Para cada paciente cria:
    * 2 consultas (1 concluída, 1 agendada futura)
    * 1 registro médico associado
    * 1 prescrição ativa
    * 1 pedido de exame + resultado (simulado se concluído)
    * 2 conjuntos de sinais vitais (histórico e recente)
*/

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)] }
function daysAgo(n:number){ const d=new Date(); d.setDate(d.getDate()-n); return d }
function daysFromNow(n:number){ const d=new Date(); d.setDate(d.getDate()+n); return d }

const complaints = [
  'Cefaleia recorrente','Fadiga','Dor torácica leve','Dispneia ao esforço','Tontura eventual','Dores articulares','Gastrite','Insonia','Ansiedade','Palpitações'
]
const histories = [
  'Histórico de hipertensão controlada','Paciente com dislipidemia','Sedentarismo relatado','Histórico familiar de diabetes','Ex-tabagista há 5 anos','Relata dieta irregular','Sono não reparador','Estresse ocupacional elevado'
]
const assessments = [
  'Quadro estável','Necessita acompanhamento','Melhora parcial com tratamento','Manter conduta atual','Reavaliar em 30 dias','Investigar causas metabólicas'
]
const plans = [
  'Solicitar exames laboratoriais','Ajustar medicação','Reforçar mudança de estilo de vida','Encaminhar para nutrição','Iniciar fisioterapia leve','Aumentar hidratação','Registrar diário de sintomas'
]
const medications = [
  {medication:'Metformina',dosage:'850mg',frequency:'2x/dia',duration:'60 dias',instructions:'Tomar com alimentos'},
  {medication:'Atorvastatina',dosage:'20mg',frequency:'1x/dia',duration:'90 dias',instructions:'No horário de dormir'},
  {medication:'Losartana',dosage:'50mg',frequency:'2x/dia',duration:'60 dias',instructions:'Monitorar pressão'},
  {medication:'Omeprazol',dosage:'20mg',frequency:'1x/dia',duration:'30 dias',instructions:'Antes do café da manhã'},
]
const examTypes = ['Hemograma completo','Perfil lipídico','Glicemia de jejum','TSH','Raio-X Tórax','ECG','Ultrassom Abdominal']

async function main(){
  console.log('> Gerando dados demo...')
  const patients = await prisma.patient.findMany({ take: 10, orderBy: { createdAt: 'asc' } })
  if(patients.length===0){ console.log('Nenhum paciente encontrado. Execute seed básico primeiro.'); return }

  const admin = await prisma.user.findFirst({ where:{ role:'ADMIN' } })
  if(!admin){ console.log('Usuário admin não encontrado.'); return }

  let createdConsultations=0, createdRecords=0, createdPrescriptions=0, createdExams=0, createdVitals=0

  for(const patient of patients){
    // Consulta passada concluída
    const pastConsult = await prisma.consultation.create({
      data:{
        scheduledDate: daysAgo( rand([7,14,21,30]) ),
        actualDate: daysAgo( rand([6,13,20,29]) ),
        type: rand([ConsultationType.ROUTINE, ConsultationType.FOLLOW_UP]),
        status: ConsultationStatus.COMPLETED,
        chiefComplaint: rand(complaints),
        history: rand(histories),
        assessment: rand(assessments),
        plan: rand(plans),
        patientId: patient.id,
        doctorId: admin.id
      }
    })
    createdConsultations++

    // Consulta futura agendada
    await prisma.consultation.create({
      data:{
        scheduledDate: daysFromNow( rand([3,5,10,15]) ),
        type: rand([ConsultationType.ROUTINE, ConsultationType.FOLLOW_UP, ConsultationType.SPECIALIST]),
        status: ConsultationStatus.SCHEDULED,
        chiefComplaint: rand(complaints),
        patientId: patient.id,
        doctorId: admin.id
      }
    })
    createdConsultations++

    // Registro médico ligado à consulta passada
    await prisma.medicalRecord.create({
      data:{
        title: 'Registro Clínico - '+patient.name.split(' ')[0],
        description: 'Resumo clínico automático gerado para demonstração.',
        diagnosis: rand(assessments),
        treatment: rand(plans),
        notes: 'Registro sintético para fins de demonstração.',
        recordType: rand([RecordType.CONSULTATION, RecordType.FOLLOW_UP, RecordType.DIAGNOSIS]),
        severity: rand([Severity.LOW, Severity.MEDIUM]),
        patientId: patient.id,
        doctorId: admin.id
      }
    })
    createdRecords++

    // Prescrição ativa
    const rx = rand(medications)
    await prisma.prescription.create({
      data:{
        ...rx,
        status: PrescriptionStatus.ACTIVE,
        patientId: patient.id,
        doctorId: admin.id
      }
    })
    createdPrescriptions++

    // Pedido de exame
    const examType = rand(examTypes)
    const exam = await prisma.examRequest.create({
      data:{
        examType,
        description: 'Solicitação para avaliação clínica.',
        urgency: rand([Urgency.ROUTINE, Urgency.URGENT]),
        status: rand([ExamStatus.REQUESTED, ExamStatus.SCHEDULED]),
        patientId: patient.id,
        doctorId: admin.id
      }
    })
    createdExams++

    // Resultado de exame automático
  const resultData: Record<string,any> = {
      'Hemograma completo': { hemacias: rand([4.5,5.0,5.2]), leucocitos: rand([6000,7000,8000]), plaquetas: rand([200000,250000,300000]) },
      'Perfil lipídico': { colesterol_total: rand([180,200,220]), hdl: rand([40,50,60]), ldl: rand([100,120,140]), triglicerideos: rand([100,130,160]) },
      'Glicemia de jejum': { glicemia: rand([85,90,95,100,110]) },
      'TSH': { tsh: rand([1.0,2.0,2.5,3.0]) },
      'Raio-X Tórax': { laudo: 'Sem alterações agudas. Parênquima preservado.' },
      'ECG': { laudo: 'Ritmo sinusal. Sem alterações isquêmicas.' },
      'Ultrassom Abdominal': { laudo: 'Fígado, baço e rins sem alterações. Vesícula sem cálculos.' }
    }
    const result = resultData[examType] || { laudo: 'Exame normal.' }
    await prisma.examResult.create({
      data:{
        examType,
        results: JSON.stringify(result),
        examDate: new Date(),
        patientId: patient.id
      }
    })
    // Atualizar status do exame para COMPLETED
    await prisma.examRequest.update({ where: { id: exam.id }, data: { status: ExamStatus.COMPLETED, completedDate: new Date() } })

    // Sinais vitais históricos
    await prisma.vitalSigns.create({
      data:{
        patientId: patient.id,
        consultationId: pastConsult.id,
        systolicBP: rand([110,115,120,125,130]),
        diastolicBP: rand([70,75,80,85]),
        heartRate: rand([60,65,70,75,80]),
        respiratoryRate: rand([14,16,18]),
        temperature: rand([36.5,36.7,36.8,37.0]),
        weight: rand([60,65,70,75,80]),
        height: rand([160,165,170,175,180]),
        oxygenSaturation: rand([96,97,98,99]),
        bloodGlucose: rand([85,90,95,100,110])
      }
    })
    createdVitals++

    // Sinais vitais recentes (sem consulta vinculada)
    await prisma.vitalSigns.create({
      data:{
        patientId: patient.id,
        systolicBP: rand([110,118,122,128,132]),
        diastolicBP: rand([70,72,78,82]),
        heartRate: rand([62,68,72,76]),
        respiratoryRate: rand([14,16,17]),
        temperature: rand([36.5,36.6,36.9]),
        weight: rand([60,66,71,76,81]),
        height: rand([160,165,170,175,180]),
        oxygenSaturation: rand([97,98,99]),
        bloodGlucose: rand([88,92,96,102,108])
      }
    })
    createdVitals++
  }

  console.log('> Concluído:')
  console.log({ createdConsultations, createdRecords, createdPrescriptions, createdExams, createdVitals })
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())
