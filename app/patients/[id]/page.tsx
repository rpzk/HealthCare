import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { HydrationGuard } from '@/components/hydration-guard'
import { PatientDetailsContent } from '@/components/patients/patient-details-content'
import { decrypt, hashCPF } from '@/lib/crypto'
import { applyPatientMasking } from '@/lib/masking'

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

  let patientView: Record<string, unknown> = {
    ...patient,
    cpf: decryptedCpf,
    bloodType: mergedBloodType || null,
    allergies: mergedAllergies || null,
  }

  // LGPD: Admin/Manager vê dados pseudonimizados
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  const isAdmin = role === 'ADMIN' || role === 'OWNER' || role === 'MANAGER'
  if (isAdmin) {
    patientView = applyPatientMasking(patientView as never, { isAdmin: true }) as Record<string, unknown>
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title={String(patientView.name ?? '')}
            description={`CPF: ${String(patientView.cpf ?? 'Não informado')} • ${String(patientView.email ?? 'Email não informado')}`}
            breadcrumbs={[
              { label: 'Pacientes', href: '/patients' },
              { label: String(patientView.name ?? '') }
            ]}
            showBackButton={true}
            showHomeButton={true}
          />
          <HydrationGuard fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
            <PatientDetailsContent patient={patientView as import('@prisma/client').Patient} />
          </HydrationGuard>
        </main>
      </div>
    </div>
  )
}
