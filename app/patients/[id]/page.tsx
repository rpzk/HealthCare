import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { HydrationGuard } from '@/components/hydration-guard'
import { PatientDetailsContent } from '@/components/patients/patient-details-content'
import { decrypt, hashCPF } from '@/lib/crypto'

export const metadata: Metadata = {
  title: 'Detalhes do Paciente - Sistema de Prontuário Eletrônico',
  description: 'Visualizar detalhes do paciente',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailsPage({ params }: PageProps) {
  const { id } = await params
  
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      consultations: {
        take: 5,
        orderBy: { scheduledDate: 'desc' },
      },
      prescriptions: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      ExamRequest: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!patient) {
    notFound()
  }

  // Merge data from any duplicate record matched by CPF hash (if present)
  let mergedBloodType: string | null | undefined = patient.bloodType
  let mergedAllergies: string | null | undefined = decrypt(patient.allergies as string | null)
  const decryptedCpf = decrypt(patient.cpf as string | null)
  const cpfHash = hashCPF(decryptedCpf || undefined)

  if ((!mergedBloodType || mergedBloodType === '') && cpfHash) {
    const counterpart = await prisma.patient.findFirst({
      where: { cpfHash },
      select: { id: true, bloodType: true, allergies: true },
    })
    if (counterpart) {
      if (counterpart.bloodType) mergedBloodType = counterpart.bloodType
      const counterpartAllergies = decrypt(counterpart.allergies as string | null)
      if (!mergedAllergies && counterpartAllergies) mergedAllergies = counterpartAllergies
    }
  }

  const patientView = {
    ...patient,
    cpf: decryptedCpf,
    bloodType: mergedBloodType || null,
    allergies: mergedAllergies || null,
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title={patientView.name}
            description={`CPF: ${patientView.cpf || 'Não informado'} • ${patientView.email || 'Email não informado'}`}
            breadcrumbs={[
              { label: 'Pacientes', href: '/patients' },
              { label: patientView.name }
            ]}
            showBackButton={true}
            showHomeButton={true}
          />
          <HydrationGuard fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
            <PatientDetailsContent patient={patientView} />
          </HydrationGuard>
        </main>
      </div>
    </div>
  )
}
