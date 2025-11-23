import { prisma } from '@/lib/prisma'
import { RecordType } from '@prisma/client'
import type { SoapNote } from '@/lib/ai-soap'

export async function saveSoapAsMedicalRecord(params: {
  patientId: string
  doctorId: string
  soap: SoapNote
}): Promise<{ id: string }>{
  const { patientId, doctorId, soap } = params

  const title = soap.assessment?.summary?.slice(0, 80) || 'Evolução SOAP gerada por IA'

  const descriptionParts: string[] = []
  if (soap.subjective?.chiefComplaint) descriptionParts.push(`Queixa principal: ${soap.subjective.chiefComplaint}`)
  if (soap.objective?.physicalExam) descriptionParts.push(`Exame físico: ${soap.objective.physicalExam}`)
  if (soap.assessment?.diagnoses?.length) {
    const dx = soap.assessment.diagnoses.map(d => d.label).join('; ')
    descriptionParts.push(`Hipóteses: ${dx}`)
  }
  if (soap.plan?.treatments?.length) descriptionParts.push(`Condutas: ${soap.plan.treatments.join('; ')}`)

  const description = descriptionParts.join('\n') || 'Evolução SOAP gerada automaticamente a partir de transcrição.'

  const created = await prisma.medicalRecord.create({
    data: {
      title,
      description,
      diagnosis: soap.assessment?.diagnoses?.map(d => d.label).join('; '),
      treatment: soap.plan?.treatments?.join('; '),
      notes: JSON.stringify(soap, null, 2),
      recordType: RecordType.FOLLOW_UP,
      priority: 'NORMAL',
      patient: { connect: { id: patientId } },
      doctor: { connect: { id: doctorId } }
    },
    select: { id: true }
  })

  return created
}
