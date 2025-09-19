import { PatientService } from './lib/patient-service'
import { prisma } from './lib/prisma'
import { Gender } from '@prisma/client'

async function run(){
  console.log('▶ Teste PatientService básico')
  // Criar paciente
  const patient = await PatientService.createPatient({
    name: 'Paciente Teste',
    email: 'paciente.teste@example.com',
    birthDate: new Date('1990-01-01'),
    gender: Gender.MALE
  } as any)
  console.log('Criado:', patient.id)

  const list = await PatientService.getPatients({}, 1, 10)
  // Support both shapes: { total } or { pagination: { total } }
  function extractTotal(l: any): number {
    if (typeof l.total === 'number') return l.total
    if (l.pagination && typeof l.pagination.total === 'number') return l.pagination.total
    return 0
  }

  const total = extractTotal(list)
  console.log('Total listados:', total)
  if (total < 1) throw new Error('Paciente não listado')

  const fetched = await PatientService.getPatientById(patient.id)
  console.log('Fetch OK:', fetched.id)

  console.log('✔ Teste básico OK')
}
run().catch(e=>{console.error('Falhou', e);process.exit(1)}).finally(()=>prisma.$disconnect())
