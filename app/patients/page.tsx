import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PatientsList } from '@/components/patients/patients-list'
import { PageHeader } from '@/components/navigation/page-header'
import { HydrationGuard } from '@/components/hydration-guard'

export const metadata: Metadata = {
  title: 'Pacientes - Sistema de Prontuário Eletrônico',
  description: 'Gestão de pacientes do sistema médico',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-24">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Gestão de Pacientes"
            description="Visualize e gerencie todos os seus pacientes"
            breadcrumbs={[
              { label: 'Pacientes' }
            ]}
            showBackButton={false}
            showHomeButton={true}
          />
          <HydrationGuard fallback={<div className="text-sm text-gray-500">Carregando pacientes...</div>}>
            <PatientsList />
          </HydrationGuard>
        </main>
      </div>
    </div>
  )
}
