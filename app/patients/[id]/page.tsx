import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { HydrationGuard } from '@/components/hydration-guard'
import { PatientDetailsContent } from '@/components/patients/patient-details-content'

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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title={patient.name}
            description={`CPF: ${patient.cpf || 'Não informado'} • ${patient.email || 'Email não informado'}`}
            breadcrumbs={[
              { label: 'Pacientes', href: '/patients' },
              { label: patient.name }
            ]}
            showBackButton={true}
            showHomeButton={true}
          />
          <HydrationGuard fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
            <PatientDetailsContent patient={patient} />
          </HydrationGuard>
        </main>
      </div>
    </div>
  )
}
